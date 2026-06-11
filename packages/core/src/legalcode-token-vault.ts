export * as LegalCodeTokenVault from "./legalcode-token-vault"

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"
import os from "os"
import path from "path"
import { Context, Effect, Layer, SynchronizedRef } from "effect"
import { FSUtil } from "./fs-util"
import { Global } from "./global"
import { LegalCode } from "./legalcode"

type StoredEntry = LegalCode.WorkspaceTokenVaultInfo & {
  iv: string
  tag: string
  ciphertext: string
}

type Writable = {
  version: 1
  entries: Record<string, StoredEntry>
}

type Secret = {
  accessToken: string
  refreshToken?: string
  idToken?: string
  clientID?: string
  clientSecret?: string
  tenantID?: string
}

export type RefreshableToken = LegalCode.WorkspaceOAuthTokenResponse & {
  ref: LegalCode.WorkspaceTokenVaultRef
  clientID?: string
  clientSecret?: string
  tenantID?: string
  scopes: string[]
}

export interface Interface {
  readonly store: (input: LegalCode.WorkspaceTokenVaultStore) => Effect.Effect<LegalCode.WorkspaceTokenVaultInfo>
  readonly list: (provider?: LegalCode.WorkspaceProvider) => Effect.Effect<LegalCode.WorkspaceTokenVaultInfo[]>
  readonly get: (ref: LegalCode.WorkspaceTokenVaultRef) => Effect.Effect<LegalCode.WorkspaceOAuthTokenResponse | undefined>
  readonly getRefreshable: (ref: LegalCode.WorkspaceTokenVaultRef) => Effect.Effect<RefreshableToken | undefined>
  readonly update: (
    ref: LegalCode.WorkspaceTokenVaultRef,
    input: LegalCode.WorkspaceOAuthTokenResponse,
  ) => Effect.Effect<LegalCode.WorkspaceTokenVaultInfo | undefined>
  readonly remove: (ref: LegalCode.WorkspaceTokenVaultRef) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/legalcode/TokenVault") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const global = yield* Global.Service
    const file = path.join(global.data, "legalcode-token-vault.json")
    const key = vaultKey(global)

    const read = Effect.fnUntraced(function* () {
      const raw = yield* fs.readJson(file).pipe(Effect.orElseSucceed(() => undefined))
      if (raw && typeof raw === "object" && "version" in raw && raw.version === 1) return raw as Writable
      return { version: 1, entries: {} }
    })

    const write = (data: Writable) => fs.writeJson(file, data, 0o600).pipe(Effect.orDie)
    const state = SynchronizedRef.makeUnsafe(yield* read())

    return Service.of({
      store: Effect.fn("LegalCodeTokenVault.store")(function* (input) {
        const now = new Date().toISOString()
        const ref = LegalCode.WorkspaceTokenVaultRef.create()
        const expiresAt = input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000).toISOString() : undefined
        const encrypted = encrypt(
          key,
          JSON.stringify({
            accessToken: input.accessToken,
            refreshToken: input.refreshToken,
            idToken: input.idToken,
            clientID: input.clientID,
            clientSecret: input.clientSecret,
            tenantID: input.tenantID,
          } satisfies Secret),
        )
        const info: LegalCode.WorkspaceTokenVaultInfo = {
          ref,
          provider: input.provider,
          accountEmail: input.accountEmail,
          accountLabel: input.accountLabel,
          tenantID: input.tenantID,
          scopes: input.scopes,
          tokenType: input.tokenType,
          expiresAt,
          timeCreated: now,
          timeUpdated: now,
        }
        const entry: StoredEntry = { ...info, ...encrypted }
        yield* SynchronizedRef.modifyEffect(
          state,
          Effect.fnUntraced(function* (data) {
            const next = { ...data, entries: { ...data.entries, [ref]: entry } }
            yield* write(next)
            return [undefined, next] as const
          }),
        )
        return info
      }),

      list: Effect.fn("LegalCodeTokenVault.list")(function* (provider) {
        const data = yield* SynchronizedRef.get(state)
        return Object.values(data.entries)
          .filter((entry) => !provider || entry.provider === provider)
          .map(redact)
      }),

      get: Effect.fn("LegalCodeTokenVault.get")(function* (ref) {
        const entry = (yield* SynchronizedRef.get(state)).entries[ref]
        if (!entry) return undefined
        const secret = JSON.parse(decrypt(key, entry)) as Secret
        return tokenFromEntry(entry, secret)
      }),

      getRefreshable: Effect.fn("LegalCodeTokenVault.getRefreshable")(function* (ref) {
        const entry = (yield* SynchronizedRef.get(state)).entries[ref]
        if (!entry) return undefined
        const secret = JSON.parse(decrypt(key, entry)) as Secret
        return {
          ...tokenFromEntry(entry, secret),
          ref,
          clientID: secret.clientID,
          clientSecret: secret.clientSecret,
          tenantID: secret.tenantID ?? entry.tenantID,
          scopes: entry.scopes,
        }
      }),

      update: Effect.fn("LegalCodeTokenVault.update")(function* (ref, input) {
        return yield* SynchronizedRef.modifyEffect(
          state,
          Effect.fnUntraced(function* (data) {
            const entry = data.entries[ref]
            if (!entry) return [undefined, data] as const
            const previous = JSON.parse(decrypt(key, entry)) as Secret
            const scopes = input.scope?.split(/\s+/).filter(Boolean) ?? entry.scopes
            const expiresAt = input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000).toISOString() : undefined
            const encrypted = encrypt(
              key,
              JSON.stringify({
                ...previous,
                accessToken: input.accessToken,
                refreshToken: input.refreshToken ?? previous.refreshToken,
                idToken: input.idToken ?? previous.idToken,
              } satisfies Secret),
            )
            const nextEntry: StoredEntry = {
              ...entry,
              ...encrypted,
              scopes,
              tokenType: input.tokenType,
              expiresAt,
              timeUpdated: new Date().toISOString(),
            }
            const next = { ...data, entries: { ...data.entries, [ref]: nextEntry } }
            yield* write(next)
            return [redact(nextEntry), next] as const
          }),
        )
      }),

      remove: Effect.fn("LegalCodeTokenVault.remove")(function* (ref) {
        yield* SynchronizedRef.modifyEffect(
          state,
          Effect.fnUntraced(function* (data) {
            if (!data.entries[ref]) return [undefined, data] as const
            const entries = { ...data.entries }
            delete entries[ref]
            const next = { ...data, entries }
            yield* write(next)
            return [undefined, next] as const
          }),
        )
      }),
    })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(FSUtil.defaultLayer), Layer.provide(Global.defaultLayer))

function vaultKey(global: Global.Interface) {
  const secret =
    process.env.LEGALCODE_TOKEN_VAULT_KEY ??
    process.env.OPENCODE_LEGALCODE_TOKEN_VAULT_KEY ??
    `${os.hostname()}:${os.userInfo().username}:${global.data}`
  return scryptSync(secret, "legalcode-token-vault-v1", 32)
}

function encrypt(key: Buffer, value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return {
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  }
}

function decrypt(key: Buffer, entry: Pick<StoredEntry, "iv" | "tag" | "ciphertext">) {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(entry.iv, "base64url"))
  decipher.setAuthTag(Buffer.from(entry.tag, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(entry.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

function redact(entry: StoredEntry): LegalCode.WorkspaceTokenVaultInfo {
  return {
    ref: entry.ref,
    provider: entry.provider,
    accountEmail: entry.accountEmail,
    accountLabel: entry.accountLabel,
    tenantID: entry.tenantID,
    scopes: entry.scopes,
    tokenType: entry.tokenType,
    expiresAt: entry.expiresAt,
    timeCreated: entry.timeCreated,
    timeUpdated: entry.timeUpdated,
  }
}

function tokenFromEntry(entry: StoredEntry, secret: Secret): LegalCode.WorkspaceOAuthTokenResponse {
  return {
    provider: entry.provider,
    tokenType: entry.tokenType,
    scope: entry.scopes.join(" "),
    accessToken: secret.accessToken,
    refreshToken: secret.refreshToken,
    idToken: secret.idToken,
    expiresIn: entry.expiresAt
      ? Math.max(0, Math.floor((new Date(entry.expiresAt).getTime() - Date.now()) / 1000))
      : undefined,
  }
}
