import { describe, expect, test } from "bun:test"
import { createLegalCodeWorkspaceClient } from "./workspace-client"

type RecordedRequest = {
  url: string
  init?: RequestInit
}

const matterID = "mat_test" as never
const connectionID = "wcn_test" as never
const externalArtifactID = "xar_test" as never
const tokenVaultRef = "tvr_test" as never
const operationID = "wop_test" as never

function createFetch(responses: unknown[]) {
  const requests: RecordedRequest[] = []
  const fetch: typeof globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init })
    const next = responses.shift()
    return new Response(JSON.stringify(next), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }
  return { fetch, requests }
}

describe("LegalCode workspace client", () => {
  test("starts a connection and opens the provider authorization URL", async () => {
    const opened: string[] = []
    const { fetch, requests } = createFetch([
      {
        data: {
          provider: "google_workspace",
          authorizationURL: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
          scopes: ["openid"],
          state: "state",
          codeVerifier: "verifier",
          codeChallenge: "challenge",
          redirectURI: "legalcode://workspace/oauth/callback",
        },
      },
    ])
    const client = createLegalCodeWorkspaceClient({
      server: { url: "http://127.0.0.1:4096", username: "opencode", password: "secret" },
      fetch,
      workspaceBridge: {
        openAuthorizationURL: async (url) => opened.push(url),
        openPickerURL: async () => undefined,
      },
    })

    const response = await client.startConnection({
      provider: "google_workspace",
      clientID: "client",
      redirectURI: "legalcode://workspace/oauth/callback",
    })

    expect(response.state).toBe("state")
    expect(opened).toEqual(["https://accounts.google.com/o/oauth2/v2/auth?client_id=test"])
    expect(requests[0]?.url).toBe("http://127.0.0.1:4096/api/legalcode/workspace/connect/start")
    expect((requests[0]?.init?.headers as Record<string, string>).Authorization).toMatch(/^Basic /)
  })

  test("imports a selected provider file through the server endpoint", async () => {
    const { fetch, requests } = createFetch([
      {
        data: {
          operation: { id: operationID },
          request: {
            method: "GET",
            url: "https://www.googleapis.com/drive/v3/files/file-1",
            headers: {},
            bodyKind: "none",
          },
          metadata: {},
          blockedReasons: [],
        },
      },
    ])
    const client = createLegalCodeWorkspaceClient({
      server: { url: "http://127.0.0.1:4096" },
      fetch,
    })

    await client.importSelectedFile({
      matterID,
      connectionID,
      provider: "google_workspace",
      app: "google_docs",
      tokenVaultRef,
      externalID: "file-1",
      actor: "lawyer@example.com",
    })

    expect(requests[0]?.url).toBe("http://127.0.0.1:4096/api/legalcode/workspace/artifacts/import")
    expect(JSON.parse(String(requests[0]?.init?.body))).toMatchObject({
      matterID,
      connectionID,
      externalID: "file-1",
    })
  })

  test("runs approved writeback only after a clean conflict preflight", async () => {
    const { fetch, requests } = createFetch([
      {
        data: {
          artifact: { id: externalArtifactID },
          operation: { id: operationID },
          request: {
            method: "GET",
            url: "https://graph.microsoft.com/v1.0/me/drive/items/item-1",
            headers: {},
            bodyKind: "none",
          },
          status: "clean",
          currentETag: "etag-current",
          currentRevision: "rev-current",
          conflictReasons: [],
          blockedReasons: [],
          metadata: {},
        },
      },
      {
        data: {
          operation: { id: "wop_write" },
          request: {
            method: "PUT",
            url: "https://graph.microsoft.com/v1.0/me/drive/items/item-1/content",
            headers: {},
            bodyKind: "text",
          },
          blockedReasons: [],
        },
      },
    ])
    const client = createLegalCodeWorkspaceClient({
      server: { url: "http://127.0.0.1:4096" },
      fetch,
    })

    await client.runApprovedWriteback({
      matterID,
      connectionID,
      externalArtifactID,
      provider: "microsoft_365",
      app: "word",
      operation: "edit",
      tokenVaultRef,
      resourceID: "item-1",
      actor: "lawyer@example.com",
      approval: "approved",
      inputSummary: "Approved settlement brief revision",
      sourceSpans: [{ sourceID: "src_1" as never }],
      auditEventID: "aud_1" as never,
      content: "final text",
      contentType: "text/plain",
    })

    expect(requests.map((request) => new URL(request.url).pathname)).toEqual([
      "/api/legalcode/workspace/conflicts/check",
      "/api/legalcode/workspace/execute-with-vault",
    ])
    expect(JSON.parse(String(requests[1]?.init?.body))).toMatchObject({
      conflictStatus: "clean",
      conflictCheckOperationID: operationID,
      expectedETag: "etag-current",
      expectedRevision: "rev-current",
    })
  })

  test("blocks approved writeback when conflict preflight is not clean", async () => {
    const { fetch, requests } = createFetch([
      {
        data: {
          artifact: { id: externalArtifactID },
          operation: { id: operationID },
          request: {
            method: "GET",
            url: "https://drive.google.com/file-1",
            headers: {},
            bodyKind: "none",
          },
          status: "conflict",
          conflictReasons: ["External artifact ETag changed."],
          blockedReasons: [],
          metadata: {},
        },
      },
    ])
    const client = createLegalCodeWorkspaceClient({
      server: { url: "http://127.0.0.1:4096" },
      fetch,
    })

    await expect(
      client.runApprovedWriteback({
        matterID,
        connectionID,
        externalArtifactID,
        provider: "google_workspace",
        app: "google_docs",
        operation: "edit",
        tokenVaultRef,
        resourceID: "file-1",
        actor: "lawyer@example.com",
        approval: "approved",
        inputSummary: "Approved demand letter revision",
        sourceSpans: [{ sourceID: "src_1" as never }],
        auditEventID: "aud_1" as never,
        body: { requests: [] },
      }),
    ).rejects.toThrow("Workspace writeback blocked")

    expect(requests.map((request) => new URL(request.url).pathname)).toEqual([
      "/api/legalcode/workspace/conflicts/check",
    ])
  })
})
