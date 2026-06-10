import { describe, expect, test } from "bun:test"
import { validateLegalCodeWorkspaceURL } from "./legalcode-workspace-url"

describe("LegalCode workspace URL validation", () => {
  test("allows Google and Microsoft authorization URLs", () => {
    expect(() =>
      validateLegalCodeWorkspaceURL("https://accounts.google.com/o/oauth2/v2/auth?client_id=test", "authorization"),
    ).not.toThrow()
    expect(() =>
      validateLegalCodeWorkspaceURL(
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=test",
        "authorization",
      ),
    ).not.toThrow()
  })

  test("allows provider picker and selected-file callback URLs", () => {
    expect(() => validateLegalCodeWorkspaceURL("https://drive.google.com/picker?state=test", "picker")).not.toThrow()
    expect(() =>
      validateLegalCodeWorkspaceURL("https://tenant.sharepoint.com/sites/legal/Shared%20Documents", "picker"),
    ).not.toThrow()
    expect(() =>
      validateLegalCodeWorkspaceURL(
        "legalcode://workspace/file-selected?provider=google_workspace&fileId=file-1",
        "picker",
      ),
    ).not.toThrow()
  })

  test("rejects unsafe schemes and unsupported hosts", () => {
    expect(() => validateLegalCodeWorkspaceURL("javascript:alert(1)", "authorization")).toThrow("HTTPS")
    expect(() => validateLegalCodeWorkspaceURL("https://example.com/oauth", "authorization")).toThrow("Unsupported")
    expect(() => validateLegalCodeWorkspaceURL("https://example.com/picker", "picker")).toThrow("Unsupported")
  })
})
