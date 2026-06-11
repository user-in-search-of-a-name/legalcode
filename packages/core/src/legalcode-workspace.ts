export * as LegalCodeWorkspace from "./legalcode-workspace"

import { createHash, randomBytes } from "crypto"
import { LegalCode } from "./legalcode"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const MICROSOFT_TENANT = "common"

const writeOperations = new Set<LegalCode.WorkspaceOperationKind>([
  "write",
  "edit",
  "comment",
  "suggest",
  "export",
  "sync",
])

export function defaultScopes(provider: LegalCode.WorkspaceProvider) {
  if (provider === "google_workspace") {
    return [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/spreadsheets",
    ]
  }
  return ["openid", "profile", "email", "offline_access", "User.Read", "Files.ReadWrite"]
}

export function authorizationURL(
  input: LegalCode.WorkspaceOAuthAuthorizeRequest,
): LegalCode.WorkspaceOAuthAuthorizeResponse {
  const scopes = input.scopes?.length ? input.scopes : defaultScopes(input.provider)
  const url =
    input.provider === "google_workspace"
      ? new URL(GOOGLE_AUTH_URL)
      : new URL(`https://login.microsoftonline.com/${input.tenantID ?? MICROSOFT_TENANT}/oauth2/v2.0/authorize`)

  url.searchParams.set("client_id", input.clientID)
  url.searchParams.set("redirect_uri", input.redirectURI)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", scopes.join(" "))
  url.searchParams.set("state", input.state)
  if (input.codeChallenge) {
    url.searchParams.set("code_challenge", input.codeChallenge)
    url.searchParams.set("code_challenge_method", "S256")
  }
  if (input.provider === "google_workspace") {
    url.searchParams.set("access_type", "offline")
    url.searchParams.set("include_granted_scopes", "true")
    if (input.prompt) url.searchParams.set("prompt", input.prompt)
  } else {
    url.searchParams.set("response_mode", "query")
    if (input.prompt) url.searchParams.set("prompt", input.prompt)
  }

  return { provider: input.provider, authorizationURL: url.toString(), scopes }
}

export function startConnection(input: LegalCode.WorkspaceConnectStartRequest): LegalCode.WorkspaceConnectStartResponse {
  const state = randomBase64URL(32)
  const codeVerifier = randomBase64URL(64)
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url")
  const auth = authorizationURL({
    provider: input.provider,
    clientID: input.clientID,
    redirectURI: input.redirectURI,
    scopes: input.scopes,
    state,
    codeChallenge,
    tenantID: input.tenantID,
    prompt: input.prompt,
  })
  return {
    ...auth,
    state,
    codeVerifier,
    codeChallenge,
    redirectURI: input.redirectURI,
    matterID: input.matterID,
  }
}

export async function exchangeToken(
  input: LegalCode.WorkspaceOAuthTokenRequest,
): Promise<LegalCode.WorkspaceOAuthTokenResponse> {
  const tokenURL =
    input.provider === "google_workspace"
      ? GOOGLE_TOKEN_URL
      : `https://login.microsoftonline.com/${input.tenantID ?? MICROSOFT_TENANT}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    client_id: input.clientID,
    redirect_uri: input.redirectURI,
    grant_type: "authorization_code",
    code: input.code,
  })
  if (input.codeVerifier) body.set("code_verifier", input.codeVerifier)
  if (input.clientSecret) body.set("client_secret", input.clientSecret)

  const response = await fetch(tokenURL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  })
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const message =
      typeof json.error_description === "string"
        ? json.error_description
        : typeof json.error === "string"
          ? json.error
          : `Token exchange failed with HTTP ${response.status}`
    throw new Error(message)
  }

  return {
    provider: input.provider,
    tokenType: String(json.token_type ?? "Bearer"),
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : undefined,
    scope: typeof json.scope === "string" ? json.scope : undefined,
    accessToken: String(json.access_token ?? ""),
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    idToken: typeof json.id_token === "string" ? json.id_token : undefined,
  }
}

export async function refreshToken(
  input: LegalCode.WorkspaceOAuthRefreshRequest,
): Promise<LegalCode.WorkspaceOAuthTokenResponse> {
  const tokenURL =
    input.provider === "google_workspace"
      ? GOOGLE_TOKEN_URL
      : `https://login.microsoftonline.com/${input.tenantID ?? MICROSOFT_TENANT}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    client_id: input.clientID,
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
  })
  if (input.clientSecret) body.set("client_secret", input.clientSecret)
  if (input.scopes?.length) body.set("scope", input.scopes.join(" "))

  const response = await fetch(tokenURL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  })
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const message =
      typeof json.error_description === "string"
        ? json.error_description
        : typeof json.error === "string"
          ? json.error
          : `Token refresh failed with HTTP ${response.status}`
    throw new Error(message)
  }

  return {
    provider: input.provider,
    tokenType: String(json.token_type ?? "Bearer"),
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : undefined,
    scope: typeof json.scope === "string" ? json.scope : undefined,
    accessToken: String(json.access_token ?? ""),
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : input.refreshToken,
    idToken: typeof json.id_token === "string" ? json.id_token : undefined,
  }
}

export function prepareExecuteRequest(input: LegalCode.WorkspaceExecuteRequest): {
  request: LegalCode.WorkspaceExecutePreparedRequest
  fetchHeaders: Record<string, string>
  body?: string
  blockedReasons: string[]
} {
  const blockedReasons = validateExecution(input)
  const prepared = prepareProviderRequest(input)
  return {
    request: {
      method: prepared.method,
      url: prepared.url,
      headers: redactHeaders(prepared.headers),
      bodyKind: prepared.bodyKind,
    },
    fetchHeaders: prepared.headers,
    body: prepared.body,
    blockedReasons,
  }
}

export async function execute(input: LegalCode.WorkspaceExecuteRequest): Promise<LegalCode.WorkspaceExecuteResponse> {
  const prepared = prepareExecuteRequest(input)
  const operation = makeOperation(
    input,
    prepared.blockedReasons.length > 0 ? "cancelled" : input.dryRun ? "planned" : "running",
  )
  if (prepared.blockedReasons.length > 0 || input.dryRun) {
    return { operation, request: prepared.request, blockedReasons: prepared.blockedReasons }
  }

  const response = await fetch(prepared.request.url, {
    method: prepared.request.method,
    headers: prepared.fetchHeaders,
    body: prepared.body,
  })
  const contentType = response.headers.get("content-type") ?? undefined
  const text = await response.text()
  const result: LegalCode.WorkspaceExecuteResult = {
    status: response.status,
    ok: response.ok,
    etag: response.headers.get("etag") ?? undefined,
    revision: response.headers.get("x-goog-generation") ?? response.headers.get("last-modified") ?? undefined,
    contentType,
  }
  if (text) {
    if (contentType?.includes("application/json")) result.json = JSON.parse(text)
    else result.text = text
  }

  return {
    operation: {
      ...operation,
      status: response.ok ? "succeeded" : "failed",
      outputSummary: response.ok
        ? `Workspace ${input.operation} completed with HTTP ${response.status}.`
        : `Workspace ${input.operation} failed with HTTP ${response.status}.`,
    },
    request: prepared.request,
    result,
    blockedReasons: [],
  }
}

export async function importArtifactMetadata(
  input: LegalCode.WorkspaceArtifactImportRequest & { accessToken: string },
): Promise<LegalCode.WorkspaceExecuteResponse> {
  validateImportApp(input.provider, input.app)
  const app = metadataAppForImport(input.provider, input.app)
  return execute({
    matterID: input.matterID,
    connectionID: input.connectionID,
    externalArtifactID: input.externalArtifactID,
    provider: input.provider,
    app,
    operation: "import",
    accessToken: input.accessToken,
    resourceID: input.externalID,
    siteID: input.siteID,
    actor: input.actor,
    approval: "not_required",
    inputSummary: `Import metadata for ${input.provider} ${input.app} artifact ${input.externalID}.`,
    sourceSpans: [],
    dryRun: input.dryRun,
  })
}

export function normalizeExternalArtifactMetadata(
  input: LegalCode.WorkspaceArtifactImportRequest,
  result: LegalCode.WorkspaceExecuteResult,
): Omit<LegalCode.ExternalArtifactLink, "matterID" | "connectionID" | "provider" | "app" | "externalID"> {
  const json = isRecord(result.json) ? result.json : {}
  if (input.provider === "google_workspace") {
    const revision = stringField(json, "version") ?? stringField(json, "modifiedTime")
    return {
      title: stringField(json, "name") ?? input.externalID,
      mimeType: stringField(json, "mimeType"),
      webURL: stringField(json, "webViewLink"),
      syncDirection: input.syncDirection ?? "import_only",
      syncStatus: "imported",
      etag: result.etag ?? stringField(json, "md5Checksum"),
      revision,
      humanApproval: input.humanApproval ?? "not_required",
      metadata: cleanRecord({
        ...(input.metadata ?? {}),
        providerMetadata: json,
        providerModifiedTime: stringField(json, "modifiedTime"),
        providerRevision: revision,
        importedVia: "workspace_artifact_import",
      }),
    }
  }

  const file = isRecord(json.file) ? json.file : {}
  const revision = result.revision ?? stringField(json, "cTag") ?? stringField(json, "lastModifiedDateTime")
  return {
    title: stringField(json, "name") ?? input.externalID,
    mimeType: stringField(file, "mimeType"),
    webURL: stringField(json, "webUrl"),
    syncDirection: input.syncDirection ?? "import_only",
    syncStatus: "imported",
    etag: result.etag ?? stringField(json, "eTag"),
    revision,
    humanApproval: input.humanApproval ?? "not_required",
    metadata: cleanRecord({
      ...(input.metadata ?? {}),
      providerMetadata: json,
      providerModifiedTime: stringField(json, "lastModifiedDateTime"),
      providerRevision: revision,
      driveID: stringField(isRecord(json.parentReference) ? json.parentReference : {}, "driveId"),
      importedVia: "workspace_artifact_import",
    }),
  }
}

export function checkExternalArtifactConflict(
  artifact: LegalCode.ExternalArtifact,
  result: LegalCode.WorkspaceExecuteResult | undefined,
): Pick<
  LegalCode.WorkspaceConflictCheckResponse,
  "status" | "storedETag" | "storedRevision" | "currentETag" | "currentRevision" | "conflictReasons" | "metadata"
> {
  const current = result?.ok ? extractMetadataVersion(artifact.provider, result) : {}
  const conflictReasons: string[] = []
  const unknownReasons: string[] = []
  const comparable: string[] = []

  if (artifact.etag && current.etag) {
    comparable.push("etag")
    if (artifact.etag !== current.etag) {
      conflictReasons.push("External artifact ETag changed since the last LegalCode import/sync.")
    }
  }
  if (artifact.revision && current.revision) {
    comparable.push("revision")
    if (artifact.revision !== current.revision) {
      conflictReasons.push("External artifact revision changed since the last LegalCode import/sync.")
    }
  }
  if (!artifact.etag && !artifact.revision) {
    unknownReasons.push("LegalCode has no stored ETag or revision baseline for this external artifact.")
  }
  if (!current.etag && !current.revision) {
    unknownReasons.push("The workspace provider did not return an ETag or revision for this artifact.")
  }
  if (comparable.length === 0 && unknownReasons.length === 0) {
    unknownReasons.push("No comparable ETag or revision signal was available.")
  }

  const status: LegalCode.WorkspaceConflictStatus =
    conflictReasons.length > 0 ? "conflict" : unknownReasons.length > 0 ? "unknown" : "clean"
  return {
    status,
    storedETag: artifact.etag,
    storedRevision: artifact.revision,
    currentETag: current.etag,
    currentRevision: current.revision,
    conflictReasons: conflictReasons.length > 0 ? conflictReasons : unknownReasons,
    metadata: cleanRecord({
      providerMetadata: isRecord(result?.json) ? result?.json : undefined,
      comparableSignals: comparable,
      checkedAt: new Date().toISOString(),
    }),
  }
}

function validateExecution(input: LegalCode.WorkspaceExecuteRequest) {
  const reasons: string[] = []
  if (writeOperations.has(input.operation) && input.approval !== "approved") {
    reasons.push("Workspace write/edit/export/sync operations require humanApproval: approved.")
  }
  if (writeOperations.has(input.operation) && !input.auditEventID) {
    reasons.push("Workspace write/edit/export/sync operations require an audit event before execution.")
  }
  if (writeOperations.has(input.operation) && input.sourceSpans.length === 0) {
    reasons.push("Workspace write/edit/export/sync operations require source spans for provenance.")
  }
  if (writeOperations.has(input.operation) && input.conflictStatus !== "clean") {
    reasons.push("Workspace write/edit/export/sync operations require a clean conflict check before execution.")
  }
  if (writeOperations.has(input.operation) && !input.conflictCheckOperationID) {
    reasons.push("Workspace write/edit/export/sync operations require the conflict check operation ID for provenance.")
  }
  if (input.provider === "microsoft_365" && input.app === "sharepoint" && !input.siteID) {
    reasons.push("SharePoint operations require a siteID.")
  }
  if (
    input.workspacePath &&
    (!input.workspacePath.startsWith("/") || input.workspacePath.startsWith("//") || input.workspacePath.includes("://"))
  ) {
    reasons.push("Workspace paths must be provider-relative paths, not absolute URLs.")
  }
  if ((input.operation === "write" || input.operation === "edit") && !input.body && !input.content) {
    reasons.push("Workspace write/edit operations require a JSON body or text content.")
  }
  return reasons
}

function prepareProviderRequest(input: LegalCode.WorkspaceExecuteRequest) {
  const bodyKind: LegalCode.WorkspaceExecutePreparedRequest["bodyKind"] = input.body
    ? "json"
    : input.content
      ? "text"
      : "none"
  const headers: Record<string, string> = {
    authorization: `Bearer ${input.accessToken}`,
  }
  if (input.expectedETag) headers["if-match"] = input.expectedETag
  if (bodyKind === "json") headers["content-type"] = "application/json"
  if (bodyKind === "text" && input.contentType) headers["content-type"] = input.contentType
  const body = input.body ? JSON.stringify(input.body) : input.content

  if (input.provider === "google_workspace") return prepareGoogleRequest(input, headers, body, bodyKind)
  return prepareMicrosoftRequest(input, headers, body, bodyKind)
}

function prepareGoogleRequest(
  input: LegalCode.WorkspaceExecuteRequest,
  headers: Record<string, string>,
  body: string | undefined,
  bodyKind: LegalCode.WorkspaceExecutePreparedRequest["bodyKind"],
) {
  if (input.app === "google_drive") {
    const file = encodeURIComponent(input.resourceID)
    const fields = "id,name,mimeType,webViewLink,modifiedTime,version,md5Checksum"
    if (input.operation === "read" || input.operation === "import" || input.operation === "sync") {
      return {
        method: "GET",
        url: `https://www.googleapis.com/drive/v3/files/${file}?fields=${fields}&supportsAllDrives=true`,
        headers,
        body,
        bodyKind,
      }
    }
    return {
      method: "PATCH",
      url: `https://www.googleapis.com/drive/v3/files/${file}`,
      headers,
      body,
      bodyKind,
    }
  }
  if (input.app === "google_docs") {
    const id = encodeURIComponent(input.resourceID)
    if (input.operation === "read" || input.operation === "import") {
      return { method: "GET", url: `https://docs.googleapis.com/v1/documents/${id}`, headers, body, bodyKind }
    }
    return {
      method: "POST",
      url: `https://docs.googleapis.com/v1/documents/${id}:batchUpdate`,
      headers,
      body,
      bodyKind,
    }
  }
  if (input.app === "google_sheets") {
    const id = encodeURIComponent(input.resourceID)
    if (input.operation === "read" || input.operation === "import") {
      return { method: "GET", url: `https://sheets.googleapis.com/v4/spreadsheets/${id}`, headers, body, bodyKind }
    }
    return {
      method: "POST",
      url: `https://sheets.googleapis.com/v4/spreadsheets/${id}:batchUpdate`,
      headers,
      body,
      bodyKind,
    }
  }
  throw new Error(`Unsupported Google Workspace app: ${input.app}`)
}

function prepareMicrosoftRequest(
  input: LegalCode.WorkspaceExecuteRequest,
  headers: Record<string, string>,
  body: string | undefined,
  bodyKind: LegalCode.WorkspaceExecutePreparedRequest["bodyKind"],
) {
  const item = encodeURIComponent(input.resourceID)
  const base =
    input.app === "sharepoint"
      ? `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(input.siteID ?? "")}/drive/items/${item}`
      : `https://graph.microsoft.com/v1.0/me/drive/items/${item}`

  if (input.operation === "read" || input.operation === "import") {
    const url = `${base}${input.workspacePath ?? (input.app === "word" ? "/content" : "")}`
    return { method: "GET", url, headers, body, bodyKind }
  }
  if (input.app === "excel" && input.body) {
    const path = input.workspacePath ?? "/workbook/createSession"
    return { method: input.httpMethod ?? "POST", url: `${base}${path}`, headers, body, bodyKind }
  }
  if (input.app === "sharepoint" && input.operation === "sync") {
    return {
      method: input.httpMethod ?? (body ? "PATCH" : "GET"),
      url: `${base}${input.workspacePath ?? ""}`,
      headers,
      body,
      bodyKind,
    }
  }
  return {
    method: input.httpMethod ?? "PUT",
    url: `${base}${input.workspacePath ?? "/content"}`,
    headers,
    body,
    bodyKind,
  }
}

function makeOperation(
  input: LegalCode.WorkspaceExecuteRequest,
  status: LegalCode.WorkspaceOperation["status"],
): LegalCode.WorkspaceOperation {
  return {
    id: LegalCode.WorkspaceOperationID.create(),
    matterID: input.matterID,
    connectionID: input.connectionID,
    externalArtifactID: input.externalArtifactID,
    provider: input.provider,
    app: input.app,
    operation: input.operation,
    actor: input.actor,
    status,
    approval: input.approval,
    inputSummary: input.inputSummary,
    sourceSpans: [...input.sourceSpans],
    auditEventID: input.auditEventID,
    metadata: {
      resourceID: input.resourceID,
      siteID: input.siteID,
      workspacePath: input.workspacePath,
      httpMethod: input.httpMethod,
      expectedETag: input.expectedETag,
      expectedRevision: input.expectedRevision,
      conflictStatus: input.conflictStatus,
      conflictCheckOperationID: input.conflictCheckOperationID,
      dryRun: input.dryRun === true,
    },
  }
}

function redactHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, key === "authorization" ? "Bearer <redacted>" : value]),
  )
}

function metadataAppForImport(
  provider: LegalCode.WorkspaceProvider,
  app: LegalCode.WorkspaceApp,
): LegalCode.WorkspaceApp {
  if (provider === "google_workspace") return "google_drive"
  if (app === "sharepoint") return "sharepoint"
  return "one_drive"
}

function validateImportApp(provider: LegalCode.WorkspaceProvider, app: LegalCode.WorkspaceApp) {
  const googleApps = new Set<LegalCode.WorkspaceApp>(["google_drive", "google_docs", "google_sheets"])
  const microsoftApps = new Set<LegalCode.WorkspaceApp>(["one_drive", "sharepoint", "word", "excel"])
  if (provider === "google_workspace" && !googleApps.has(app)) {
    throw new Error(`Unsupported Google Workspace artifact app: ${app}`)
  }
  if (provider === "microsoft_365" && !microsoftApps.has(app)) {
    throw new Error(`Unsupported Microsoft 365 artifact app: ${app}`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function cleanRecord(record: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))
}

function extractMetadataVersion(provider: LegalCode.WorkspaceProvider, result: LegalCode.WorkspaceExecuteResult) {
  const json = isRecord(result.json) ? result.json : {}
  if (provider === "google_workspace") {
    return {
      etag: result.etag ?? stringField(json, "md5Checksum"),
      revision: stringField(json, "version") ?? stringField(json, "modifiedTime") ?? result.revision,
    }
  }
  return {
    etag: result.etag ?? stringField(json, "eTag"),
    revision: result.revision ?? stringField(json, "cTag") ?? stringField(json, "lastModifiedDateTime"),
  }
}

function randomBase64URL(bytes: number) {
  return randomBytes(bytes).toString("base64url")
}
