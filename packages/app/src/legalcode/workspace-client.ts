import type { LegalCode } from "@opencode-ai/core/legalcode"
import type { Platform } from "../context/platform"
import type { ServerConnection } from "../context/server"
import { authTokenFromCredentials } from "../utils/server"

type FetchLike = typeof fetch

type ClientInput = {
  server: ServerConnection.HttpBase
  fetch?: FetchLike
  workspaceBridge?: NonNullable<Platform["legalcodeWorkspace"]>
}

type ApiResponse<Data> = {
  data: Data
}

type QueryValue = string | undefined

export type LegalCodeWorkspaceClient = ReturnType<typeof createLegalCodeWorkspaceClient>

export function createLegalCodeWorkspaceClient(input: ClientInput) {
  const request = createRequester(input)
  const checkConflict = (payload: LegalCode.WorkspaceConflictCheckRequest) =>
    request<LegalCode.WorkspaceConflictCheckResponse>("/api/legalcode/workspace/conflicts/check", {
      method: "POST",
      body: payload,
    })
  const executeWithVault = (payload: LegalCode.WorkspaceExecuteWithVaultRequest) =>
    request<LegalCode.WorkspaceExecuteResponse>("/api/legalcode/workspace/execute-with-vault", {
      method: "POST",
      body: payload,
    })

  return {
    profiles() {
      return request<{
        profiles: LegalCode.WorkspaceIntegrationProfile[]
        operationPlans: LegalCode.WorkspaceOperationPlan[]
      }>("/api/legalcode/workspace-integrations")
    },

    connections(query?: { matterID?: LegalCode.MatterID; provider?: LegalCode.WorkspaceProvider }) {
      return request<LegalCode.WorkspaceConnection[]>("/api/legalcode/workspace/connections", {
        query: cleanQuery(query),
      })
    },

    artifacts(query: { matterID: LegalCode.MatterID; provider?: LegalCode.WorkspaceProvider }) {
      return request<LegalCode.ExternalArtifact[]>("/api/legalcode/workspace/artifacts", {
        query: cleanQuery(query),
      })
    },

    operations(query: { matterID: LegalCode.MatterID; provider?: LegalCode.WorkspaceProvider }) {
      return request<LegalCode.WorkspaceOperation[]>("/api/legalcode/workspace/operations", {
        query: cleanQuery(query),
      })
    },

    async startConnection(payload: LegalCode.WorkspaceConnectStartRequest, options?: { openAuthorizationURL?: boolean }) {
      const response = await request<LegalCode.WorkspaceConnectStartResponse>("/api/legalcode/workspace/connect/start", {
        method: "POST",
        body: payload,
      })
      if (options?.openAuthorizationURL !== false) {
        await input.workspaceBridge?.openAuthorizationURL(response.authorizationURL)
      }
      return response
    },

    finalizeConnection(payload: LegalCode.WorkspaceConnectFinalizeRequest) {
      return request<LegalCode.WorkspaceConnectFinalizeResponse>("/api/legalcode/workspace/connect/finalize", {
        method: "POST",
        body: payload,
      })
    },

    async openPickerURL(url: string) {
      await input.workspaceBridge?.openPickerURL(url)
    },

    importSelectedFile(payload: LegalCode.WorkspaceArtifactImportRequest) {
      return request<LegalCode.WorkspaceArtifactImportResponse>("/api/legalcode/workspace/artifacts/import", {
        method: "POST",
        body: payload,
      })
    },

    checkConflict,

    executeWithVault,

    async runApprovedWriteback(
      payload: Omit<LegalCode.WorkspaceExecuteWithVaultRequest, "conflictStatus" | "conflictCheckOperationID"> & {
        externalArtifactID: LegalCode.ExternalArtifactID
      },
    ) {
      const conflict = await checkConflict({
        matterID: payload.matterID,
        externalArtifactID: payload.externalArtifactID,
        tokenVaultRef: payload.tokenVaultRef,
        actor: payload.actor,
      })
      if (conflict.status !== "clean") {
        throw new Error(
          `Workspace writeback blocked by ${conflict.status} conflict check: ${conflict.conflictReasons.join(" ")}`,
        )
      }
      return executeWithVault({
        ...payload,
        expectedETag: payload.expectedETag ?? conflict.currentETag ?? conflict.storedETag,
        expectedRevision: payload.expectedRevision ?? conflict.currentRevision ?? conflict.storedRevision,
        conflictStatus: "clean",
        conflictCheckOperationID: conflict.operation.id,
      })
    },
  }
}

function createRequester(input: ClientInput) {
  const fetchFn = input.fetch ?? fetch
  return async function request<Data>(
    path: string,
    options?: {
      method?: "GET" | "POST" | "DELETE"
      query?: Record<string, QueryValue>
      body?: unknown
    },
  ): Promise<Data> {
    const url = new URL(path, input.server.url)
    for (const [key, value] of Object.entries(options?.query ?? {})) {
      if (value) url.searchParams.set(key, value)
    }

    const response = await fetchFn(url.toString(), {
      method: options?.method ?? "GET",
      headers: {
        ...authHeader(input.server),
        ...(options?.body ? { "content-type": "application/json" } : {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })
    const json = await response.json().catch(() => undefined)
    if (!response.ok) {
      const message = errorMessage(json) ?? `LegalCode workspace request failed with HTTP ${response.status}`
      throw new Error(message)
    }
    return (json as ApiResponse<Data>).data
  }
}

function authHeader(server: ServerConnection.HttpBase) {
  if (!server.password) return {}
  return {
    Authorization: `Basic ${authTokenFromCredentials({ username: server.username, password: server.password })}`,
  }
}

function cleanQuery(input: Record<string, QueryValue> | undefined) {
  if (!input) return undefined
  return Object.fromEntries(Object.entries(input).filter(([, value]) => Boolean(value))) as Record<string, QueryValue>
}

function errorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return
  const record = value as Record<string, unknown>
  if (typeof record.message === "string") return record.message
  const error = record.error
  if (error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string") {
    return (error as Record<string, string>).message
  }
}
