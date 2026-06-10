export * as LegalCodeWorkspace from "./legalcode-workspace"

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
  const operation = makeOperation(input, prepared.blockedReasons.length === 0 ? "running" : "cancelled")
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
        url: `https://www.googleapis.com/drive/v3/files/${file}?fields=${fields}`,
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
      dryRun: input.dryRun === true,
    },
  }
}

function redactHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, key === "authorization" ? "Bearer <redacted>" : value]),
  )
}
