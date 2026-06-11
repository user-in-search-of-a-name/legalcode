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
export type LegalCodeWorkspacePayloadInput = {
  app: LegalCode.WorkspaceApp
  content: string
  workspacePath?: string
}
export type LegalCodeWorkspacePickerInput = {
  provider: LegalCode.WorkspaceProvider
  app: LegalCode.WorkspaceApp
  query?: string
  sharePointHost?: string
  sharePointSitePath?: string
}
export type LegalCodeWorkspaceSelectedFileInput = {
  provider: LegalCode.WorkspaceProvider
  app: LegalCode.WorkspaceApp
  externalID: string
  siteID?: string
  name?: string
  mimeType?: string
  webURL?: string
}
export type LegalCodeWorkspaceConflictAdvice = {
  status: LegalCode.WorkspaceConflictStatus
  canWrite: boolean
  summary: string
  reasons: string[]
  actions: string[]
}

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

    pickerURL(payload: LegalCodeWorkspacePickerInput) {
      return createLegalCodeWorkspacePickerURL(payload)
    },

    selectedFileCallbackURL(payload: LegalCodeWorkspaceSelectedFileInput) {
      return createLegalCodeWorkspaceSelectedFileCallbackURL(payload)
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

export function prepareLegalCodeWorkspacePayload(
  input: LegalCodeWorkspacePayloadInput,
): Pick<LegalCode.WorkspaceExecuteWithVaultRequest, "body" | "content" | "contentType"> {
  const content = input.content.trim()
  if (!content) return {}
  if (workspaceAppExpectsJSON(input)) return { body: parseWorkspaceJSON(content) }
  return { content: input.content, contentType: "text/plain" }
}

export function createLegalCodeWorkspacePickerURL(input: LegalCodeWorkspacePickerInput) {
  if (input.provider === "google_workspace") return googleWorkspacePickerURL(input)
  return microsoftWorkspacePickerURL(input)
}

export function createLegalCodeWorkspaceSelectedFileCallbackURL(input: LegalCodeWorkspaceSelectedFileInput) {
  const url = new URL("legalcode://workspace/file-selected")
  url.searchParams.set("provider", input.provider)
  url.searchParams.set("app", input.app)
  url.searchParams.set(input.provider === "google_workspace" ? "fileId" : "itemId", input.externalID)
  if (input.siteID) url.searchParams.set("siteID", input.siteID)
  if (input.name) url.searchParams.set("name", input.name)
  if (input.mimeType) url.searchParams.set("mimeType", input.mimeType)
  if (input.webURL) url.searchParams.set("webURL", input.webURL)
  return url.toString()
}

export function summarizeLegalCodeWorkspaceConflict(
  input: LegalCode.WorkspaceConflictCheckResponse,
): LegalCodeWorkspaceConflictAdvice {
  if (input.status === "clean") {
    return {
      status: input.status,
      canWrite: true,
      summary: "Workspace baseline is clean. Dry-run preview and approved writeback may proceed.",
      reasons: [],
      actions: ["Review the redacted dry-run request before final writeback."],
    }
  }

  const reasons = input.conflictReasons.length > 0 ? input.conflictReasons : input.blockedReasons
  return {
    status: input.status,
    canWrite: false,
    summary:
      input.status === "conflict"
        ? "Workspace artifact changed after the last LegalCode import or sync."
        : "LegalCode cannot prove the workspace artifact baseline is current.",
    reasons,
    actions: [
      "Read the latest provider version through the encrypted token vault.",
      "Compare the provider version with the lawyer-approved LegalCode draft.",
      "Re-import or sync a fresh baseline before attempting writeback again.",
    ],
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

function workspaceAppExpectsJSON(input: LegalCodeWorkspacePayloadInput) {
  if (input.app === "google_drive" || input.app === "google_docs" || input.app === "google_sheets") return true
  if (input.app === "excel") return true
  if ((input.app === "one_drive" || input.app === "sharepoint") && input.workspacePath && input.workspacePath !== "/content") {
    return true
  }
  return false
}

function parseWorkspaceJSON(content: string) {
  try {
    return JSON.parse(content)
  } catch {
    throw new Error("Workspace payload must be valid JSON for this provider app.")
  }
}

function googleWorkspacePickerURL(input: LegalCodeWorkspacePickerInput) {
  const url = new URL("https://drive.google.com/drive/search")
  const query = input.query?.trim() || googleDefaultSearchQuery(input.app)
  if (query) url.searchParams.set("q", query)
  return url.toString()
}

function googleDefaultSearchQuery(app: LegalCode.WorkspaceApp) {
  if (app === "google_docs") return "type:document"
  if (app === "google_sheets") return "type:spreadsheet"
  return ""
}

function microsoftWorkspacePickerURL(input: LegalCodeWorkspacePickerInput) {
  if (input.app === "sharepoint") {
    const host = normalizeSharePointHost(input.sharePointHost)
    const sitePath = normalizeSharePointSitePath(input.sharePointSitePath)
    const url = new URL(`https://${host}${sitePath}`)
    if (input.query?.trim()) url.searchParams.set("q", input.query.trim())
    return url.toString()
  }

  const url = new URL(input.app === "excel" || input.app === "word" ? "https://www.office.com/onedrive" : "https://onedrive.live.com/")
  if (input.query?.trim()) url.searchParams.set("qt", "search")
  if (input.query?.trim()) url.searchParams.set("q", input.query.trim())
  return url.toString()
}

function normalizeSharePointHost(input: string | undefined) {
  const host = input?.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
  if (!host) throw new Error("SharePoint picker URLs require a tenant SharePoint host.")
  if (!host.endsWith(".sharepoint.com")) throw new Error("SharePoint picker host must end with .sharepoint.com.")
  return host
}

function normalizeSharePointSitePath(input: string | undefined) {
  const trimmed = input?.trim() || "/"
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}
