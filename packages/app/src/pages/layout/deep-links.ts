export const deepLinkEvent = "opencode:deep-link"

const supportedSchemes = new Set(["legalcode:", "opencode:"])

const parseUrl = (input: string) => {
  if (typeof URL.canParse === "function" && !URL.canParse(input)) return
  try {
    const url = new URL(input)
    if (!supportedSchemes.has(url.protocol)) return
    return url
  } catch {
    return
  }
}

export const parseDeepLink = (input: string) => {
  const url = parseUrl(input)
  if (!url) return
  if (url.hostname !== "open-project") return
  const directory = url.searchParams.get("directory")
  if (!directory) return
  return directory
}

export const parseNewSessionDeepLink = (input: string) => {
  const url = parseUrl(input)
  if (!url) return
  if (url.hostname !== "new-session") return
  const directory = url.searchParams.get("directory")
  if (!directory) return
  const prompt = url.searchParams.get("prompt") || undefined
  if (!prompt) return { directory }
  return { directory, prompt }
}

type LegalCodeWorkspaceProvider = "google_workspace" | "microsoft_365"
type LegalCodeWorkspaceApp = "google_drive" | "google_docs" | "google_sheets" | "one_drive" | "sharepoint" | "word" | "excel"

const workspaceProviders = new Set<LegalCodeWorkspaceProvider>(["google_workspace", "microsoft_365"])
const workspaceApps = new Set<LegalCodeWorkspaceApp>([
  "google_drive",
  "google_docs",
  "google_sheets",
  "one_drive",
  "sharepoint",
  "word",
  "excel",
])

const optionalProvider = (value: string | null): LegalCodeWorkspaceProvider | undefined => {
  if (!value) return undefined
  return workspaceProviders.has(value as LegalCodeWorkspaceProvider) ? (value as LegalCodeWorkspaceProvider) : undefined
}

const optionalApp = (value: string | null): LegalCodeWorkspaceApp | undefined => {
  if (!value) return undefined
  return workspaceApps.has(value as LegalCodeWorkspaceApp) ? (value as LegalCodeWorkspaceApp) : undefined
}

const workspacePath = (url: URL) => `${url.hostname}${url.pathname}`

export type LegalCodeWorkspaceOAuthCallback = {
  type: "workspace_oauth_callback"
  provider?: LegalCodeWorkspaceProvider
  code?: string
  state?: string
  error?: string
  errorDescription?: string
}

export type LegalCodeWorkspaceFileSelected = {
  type: "workspace_file_selected"
  provider?: LegalCodeWorkspaceProvider
  app?: LegalCodeWorkspaceApp
  externalID: string
  siteID?: string
  name?: string
  mimeType?: string
  webURL?: string
}

export type LegalCodeWorkspaceDeepLink = LegalCodeWorkspaceOAuthCallback | LegalCodeWorkspaceFileSelected

export const parseLegalCodeWorkspaceDeepLink = (input: string): LegalCodeWorkspaceDeepLink | undefined => {
  const url = parseUrl(input)
  if (!url || url.protocol !== "legalcode:") return

  const path = workspacePath(url)
  if (path === "workspace/oauth/callback" || path === "workspace-oauth-callback") {
    return {
      type: "workspace_oauth_callback",
      provider: optionalProvider(url.searchParams.get("provider")),
      code: url.searchParams.get("code") || undefined,
      state: url.searchParams.get("state") || undefined,
      error: url.searchParams.get("error") || undefined,
      errorDescription: url.searchParams.get("error_description") || undefined,
    }
  }

  if (path === "workspace/file-selected" || path === "workspace-file-selected") {
    const externalID =
      url.searchParams.get("externalID") || url.searchParams.get("fileId") || url.searchParams.get("itemId")
    if (!externalID) return
    return {
      type: "workspace_file_selected",
      provider: optionalProvider(url.searchParams.get("provider")),
      app: optionalApp(url.searchParams.get("app")),
      externalID,
      siteID: url.searchParams.get("siteID") || undefined,
      name: url.searchParams.get("name") || undefined,
      mimeType: url.searchParams.get("mimeType") || undefined,
      webURL: url.searchParams.get("webURL") || undefined,
    }
  }
}

export const collectOpenProjectDeepLinks = (urls: string[]) =>
  urls.map(parseDeepLink).filter((directory): directory is string => !!directory)

export const collectNewSessionDeepLinks = (urls: string[]) =>
  urls.map(parseNewSessionDeepLink).filter((link): link is { directory: string; prompt?: string } => !!link)

export const collectLegalCodeWorkspaceDeepLinks = (urls: string[]) =>
  urls.map(parseLegalCodeWorkspaceDeepLink).filter((link): link is LegalCodeWorkspaceDeepLink => !!link)

type OpenCodeWindow = Window & {
  __OPENCODE__?: {
    deepLinks?: string[]
  }
}

export const drainPendingDeepLinks = (target: OpenCodeWindow) => {
  const pending = target.__OPENCODE__?.deepLinks ?? []
  if (pending.length === 0) return []
  if (target.__OPENCODE__) target.__OPENCODE__.deepLinks = []
  return pending
}
