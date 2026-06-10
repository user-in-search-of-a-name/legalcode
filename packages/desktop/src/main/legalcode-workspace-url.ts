const workspaceAuthHosts = new Set(["accounts.google.com", "login.microsoftonline.com"])
const workspacePickerHosts = new Set([
  "drive.google.com",
  "docs.google.com",
  "sheets.google.com",
  "onedrive.live.com",
  "graph.microsoft.com",
  "www.office.com",
  "office.com",
])
const workspaceMicrosoftHostSuffixes = [".sharepoint.com", ".my.sharepoint.com", ".office.com", ".microsoft.com"]

export function validateLegalCodeWorkspaceURL(input: string, kind: "authorization" | "picker") {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error("Invalid LegalCode workspace URL.")
  }
  if (url.protocol === "legalcode:") return
  if (url.protocol !== "https:") {
    throw new Error("LegalCode workspace URLs must use HTTPS or legalcode:// callbacks.")
  }

  const host = url.hostname.toLowerCase()
  const allowed =
    kind === "authorization"
      ? workspaceAuthHosts.has(host)
      : workspacePickerHosts.has(host) || workspaceMicrosoftHostSuffixes.some((suffix) => host.endsWith(suffix))
  if (!allowed) {
    throw new Error(`Unsupported LegalCode workspace ${kind} host: ${host}`)
  }
}
