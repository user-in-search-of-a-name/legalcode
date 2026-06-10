import type { LegalCode } from "@opencode-ai/core/legalcode"
import { makeEventListener } from "@solid-primitives/event-listener"
import { createMemo, createSignal, For, type JSX, onMount, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { createLegalCodeWorkspaceClient, prepareLegalCodeWorkspacePayload } from "@/legalcode/workspace-client"
import { usePlatform } from "@/context/platform"
import { useServer } from "@/context/server"
import {
  collectLegalCodeWorkspaceDeepLinks,
  deepLinkEvent,
  drainPendingDeepLinks,
  type LegalCodeWorkspaceDeepLink,
} from "@/pages/layout/deep-links"

type Status = {
  tone: "idle" | "ok" | "warn" | "error"
  text: string
}

const providerOptions: LegalCode.WorkspaceProvider[] = ["google_workspace", "microsoft_365"]
const appOptions: LegalCode.WorkspaceApp[] = [
  "google_drive",
  "google_docs",
  "google_sheets",
  "one_drive",
  "sharepoint",
  "word",
  "excel",
]
const operationOptions: LegalCode.WorkspaceOperationKind[] = ["write", "edit", "comment", "suggest", "export", "sync"]
const inputClass =
  "min-h-8 w-full rounded-[6px] border border-v2-border-border-muted bg-v2-background-bg-layer-01 px-2 text-[13px] leading-5 text-v2-text-text-base outline-none focus:border-v2-text-text-muted"
const buttonClass =
  "min-h-8 rounded-[6px] border border-v2-border-border-muted px-3 text-[13px] leading-5 text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover disabled:cursor-not-allowed disabled:opacity-50"
const recordClass =
  "grid w-full gap-0.5 rounded-[6px] border border-v2-border-border-muted bg-v2-background-bg-layer-01 px-3 py-2 text-left text-[13px] leading-5 text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover [&_small]:text-[11px] [&_small]:leading-4 [&_small]:text-v2-text-text-muted"

export default function LegalCodeWorkspacePage() {
  const server = useServer()
  const platform = usePlatform()
  const client = createMemo(() => {
    const current = server.current
    if (!current) return
    return createLegalCodeWorkspaceClient({
      server: current.http,
      fetch: platform.fetch,
      workspaceBridge: platform.legalcodeWorkspace,
    })
  })

  const [status, setStatus] = createSignal<Status>({
    tone: "idle",
    text: "Matter-scoped Google Workspace and Microsoft 365 operations.",
  })
  const [loading, setLoading] = createSignal(false)
  const [connectionStart, setConnectionStart] = createSignal<LegalCode.WorkspaceConnectStartResponse>()
  const [connections, setConnections] = createSignal<LegalCode.WorkspaceConnection[]>([])
  const [artifacts, setArtifacts] = createSignal<LegalCode.ExternalArtifact[]>([])
  const [operations, setOperations] = createSignal<LegalCode.WorkspaceOperation[]>([])
  const [lastConflict, setLastConflict] = createSignal<LegalCode.WorkspaceConflictCheckResponse>()
  const [lastRead, setLastRead] = createSignal<LegalCode.WorkspaceExecuteResponse>()
  const [lastWritebackPreview, setLastWritebackPreview] = createSignal<LegalCode.WorkspaceExecuteResponse>()

  const [matter, setMatter] = createStore({
    matterID: "",
    actor: "lawyer@example.com",
  })
  const [connect, setConnect] = createStore({
    provider: "google_workspace" as LegalCode.WorkspaceProvider,
    clientID: "",
    redirectURI: "legalcode://workspace/oauth/callback",
    codeVerifier: "",
    code: "",
    accountEmail: "",
  })
  const [picker, setPicker] = createStore({
    url: "",
    query: "",
    sharePointHost: "",
    sharePointSitePath: "",
    callbackURL: "",
    connectionID: "",
    tokenVaultRef: "",
    provider: "google_workspace" as LegalCode.WorkspaceProvider,
    app: "google_docs" as LegalCode.WorkspaceApp,
    externalID: "",
    siteID: "",
  })
  const [writeback, setWriteback] = createStore({
    connectionID: "",
    externalArtifactID: "",
    tokenVaultRef: "",
    provider: "google_workspace" as LegalCode.WorkspaceProvider,
    app: "google_docs" as LegalCode.WorkspaceApp,
    operation: "edit" as LegalCode.WorkspaceOperationKind,
    resourceID: "",
    siteID: "",
    workspacePath: "",
    httpMethod: "",
    auditEventID: "",
    sourceID: "",
    content: "",
  })
  const [readback, setReadback] = createStore({
    connectionID: "",
    externalArtifactID: "",
    tokenVaultRef: "",
    provider: "google_workspace" as LegalCode.WorkspaceProvider,
    app: "google_docs" as LegalCode.WorkspaceApp,
    resourceID: "",
    siteID: "",
    workspacePath: "",
  })

  const matterID = () => matter.matterID.trim() as LegalCode.MatterID
  const actor = () => matter.actor.trim() || "lawyer"
  const canRefreshMatter = () => Boolean(matter.matterID.trim() && client())
  const connectionTokenVaultRef = (connectionID: string) =>
    connections().find((connection) => connection.id === connectionID)?.tokenVaultRef
  const readPreview = createMemo(() => {
    const read = lastRead()
    if (!read) return ""
    return JSON.stringify(read.result?.json ?? read.result?.text ?? read.request, null, 2)
  })
  const writebackPreview = createMemo(() => {
    const preview = lastWritebackPreview()
    if (!preview) return ""
    return JSON.stringify(
      {
        operation: preview.operation,
        request: preview.request,
        blockedReasons: preview.blockedReasons,
        result: preview.result,
      },
      null,
      2,
    )
  })

  const run = async (label: string, fn: () => Promise<void>) => {
    const api = client()
    if (!api) {
      setStatus({ tone: "error", text: "No active LegalCode server connection." })
      return
    }
    setLoading(true)
    setStatus({ tone: "idle", text: label })
    try {
      await fn()
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "LegalCode workspace action failed." })
    } finally {
      setLoading(false)
    }
  }

  const refreshMatter = async () => {
    const api = client()
    if (!api || !matter.matterID.trim()) return
    const query = { matterID: matterID() }
    const [nextConnections, nextArtifacts, nextOperations] = await Promise.all([
      api.connections(query),
      api.artifacts(query),
      api.operations(query),
    ])
    setConnections(nextConnections)
    setArtifacts(nextArtifacts)
    setOperations(nextOperations)
  }

  const handleWorkspaceLinks = (urls: string[]) => {
    for (const link of collectLegalCodeWorkspaceDeepLinks(urls)) handleWorkspaceLink(link)
  }

  const handleWorkspaceLink = (link: LegalCodeWorkspaceDeepLink) => {
    if (link.type === "workspace_oauth_callback") {
      if (link.provider) setConnect("provider", link.provider)
      if (link.code) setConnect("code", link.code)
      if (link.error) setStatus({ tone: "error", text: link.errorDescription ?? link.error })
      else setStatus({ tone: "ok", text: "OAuth callback captured. Finalize the connection to store tokens locally." })
      return
    }

    if (link.provider) setPicker("provider", link.provider)
    if (link.app) setPicker("app", link.app)
    setPicker("externalID", link.externalID)
    setPicker("siteID", link.siteID ?? "")
    setStatus({ tone: "ok", text: `Selected workspace file ${link.name ?? link.externalID}. Import it to bind it to the matter.` })
  }

  const selectArtifact = (item: LegalCode.ExternalArtifact, fallbackTokenVaultRef = "") => {
    const tokenVaultRef = connectionTokenVaultRef(item.connectionID) ?? fallbackTokenVaultRef
    setWriteback("connectionID", item.connectionID)
    setWriteback("externalArtifactID", item.id)
    setWriteback("tokenVaultRef", tokenVaultRef)
    setWriteback("provider", item.provider)
    setWriteback("app", item.app)
    setWriteback("resourceID", item.externalID)
    setReadback("connectionID", item.connectionID)
    setReadback("externalArtifactID", item.id)
    setReadback("tokenVaultRef", tokenVaultRef)
    setReadback("provider", item.provider)
    setReadback("app", item.app)
    setReadback("resourceID", item.externalID)
  }

  const writebackPayload = (dryRun: boolean) => ({
    matterID: matterID(),
    connectionID: writeback.connectionID as LegalCode.WorkspaceConnectionID,
    externalArtifactID: writeback.externalArtifactID as LegalCode.ExternalArtifactID,
    provider: writeback.provider,
    app: writeback.app,
    operation: writeback.operation,
    tokenVaultRef: writeback.tokenVaultRef as LegalCode.WorkspaceTokenVaultRef,
    resourceID: writeback.resourceID,
    siteID: writeback.siteID || undefined,
    workspacePath: writeback.workspacePath || undefined,
    httpMethod: writeback.httpMethod || undefined,
    actor: actor(),
    approval: "approved" as const,
    inputSummary: dryRun
      ? "Lawyer-approved LegalCode workspace writeback dry run."
      : "Lawyer-approved LegalCode workspace writeback.",
    sourceSpans: [{ sourceID: writeback.sourceID as LegalCode.SourceID }],
    auditEventID: writeback.auditEventID as LegalCode.AuditEventID,
    dryRun,
    ...prepareLegalCodeWorkspacePayload({
      app: writeback.app,
      content: writeback.content,
      workspacePath: writeback.workspacePath || undefined,
    }),
  })

  onMount(() => {
    handleWorkspaceLinks(drainPendingDeepLinks(window))
    makeEventListener(window, deepLinkEvent, ((event: Event) => {
      const detail = (event as CustomEvent<{ urls: string[] }>).detail
      handleWorkspaceLinks(detail?.urls ?? [])
    }) as EventListener)
  })

  return (
    <main class="flex h-full min-h-0 flex-col bg-v2-background-bg-base text-v2-text-text-base">
      <header class="border-b border-v2-border-border-muted px-6 py-4">
        <div class="flex min-w-0 items-center justify-between gap-4">
          <div class="min-w-0">
            <h1 class="text-[18px] leading-6 [font-weight:620]">LegalCode Workspace</h1>
            <p class="mt-1 max-w-3xl text-[13px] leading-5 text-v2-text-text-muted">
              Connect, import, preflight, and write back Google Workspace or Microsoft 365 legal artifacts.
            </p>
          </div>
          <button
            class={buttonClass}
            disabled={!canRefreshMatter() || loading()}
            onClick={() => run("Refreshing matter workspace records...", refreshMatter)}
          >
            Refresh
          </button>
        </div>
      </header>

      <section class="border-b border-v2-border-border-muted px-6 py-3">
        <div class="grid gap-3 md:grid-cols-[minmax(180px,280px)_minmax(180px,280px)_1fr]">
          <Field label="Matter ID">
            <input
              class={inputClass}
              value={matter.matterID}
              placeholder="mat_..."
              onInput={(event) => setMatter("matterID", event.currentTarget.value)}
            />
          </Field>
          <Field label="Actor">
            <input class={inputClass} value={matter.actor} onInput={(event) => setMatter("actor", event.currentTarget.value)} />
          </Field>
          <StatusBar status={status()} loading={loading()} />
        </div>
      </section>

      <div class="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[360px_1fr]">
        <aside class="min-h-0 overflow-auto border-r border-v2-border-border-muted px-4 py-4">
          <Section title="Connect Account">
            <Field label="Provider">
              <select class={inputClass} value={connect.provider} onInput={(event) => setConnect("provider", event.currentTarget.value as LegalCode.WorkspaceProvider)}>
                <For each={providerOptions}>{(provider) => <option value={provider}>{provider}</option>}</For>
              </select>
            </Field>
            <Field label="Client ID">
              <input class={inputClass} value={connect.clientID} onInput={(event) => setConnect("clientID", event.currentTarget.value)} />
            </Field>
            <Field label="Redirect URI">
              <input class={inputClass} value={connect.redirectURI} onInput={(event) => setConnect("redirectURI", event.currentTarget.value)} />
            </Field>
            <div class="grid grid-cols-2 gap-2">
              <button
                class={buttonClass}
                disabled={!connect.clientID || loading()}
                onClick={() =>
                  run("Starting OAuth connection...", async () => {
                    const response = await client()!.startConnection(
                      {
                        provider: connect.provider,
                        clientID: connect.clientID,
                        redirectURI: connect.redirectURI,
                        matterID: matter.matterID.trim() ? matterID() : undefined,
                      },
                      { openAuthorizationURL: true },
                    )
                    setConnectionStart(response)
                    setConnect("codeVerifier", response.codeVerifier)
                    setStatus({ tone: "ok", text: "Authorization opened. Complete sign-in and return through legalcode:// callback." })
                  })
                }
              >
                Open Auth
              </button>
              <button
                class={buttonClass}
                disabled={!connect.code || !connect.codeVerifier || loading()}
                onClick={() =>
                  run("Finalizing OAuth connection...", async () => {
                    const finalized = await client()!.finalizeConnection({
                      provider: connect.provider,
                      clientID: connect.clientID,
                      redirectURI: connect.redirectURI,
                      code: connect.code,
                      codeVerifier: connect.codeVerifier,
                      matterID: matter.matterID.trim() ? matterID() : undefined,
                      accountEmail: connect.accountEmail || undefined,
                    })
                    setPicker("connectionID", finalized.connection.id)
                    setPicker("tokenVaultRef", finalized.token.ref)
                    setStatus({ tone: "ok", text: "Connection finalized and token stored in the encrypted local vault." })
                    await refreshMatter()
                  })
                }
              >
                Finalize
              </button>
            </div>
            <Show when={connectionStart()}>
              {(start) => <p class="text-[12px] leading-4 text-v2-text-text-muted">State: {start().state}</p>}
            </Show>
          </Section>

          <Section title="Import Selected File">
            <Field label="Picker URL">
              <input class={inputClass} value={picker.url} onInput={(event) => setPicker("url", event.currentTarget.value)} />
            </Field>
            <div class="grid grid-cols-2 gap-2">
              <button
                class={buttonClass}
                disabled={loading()}
                onClick={() =>
                  run("Building provider picker URL...", async () => {
                    const url = client()!.pickerURL({
                      provider: picker.provider,
                      app: picker.app,
                      query: picker.query || undefined,
                      sharePointHost: picker.sharePointHost || undefined,
                      sharePointSitePath: picker.sharePointSitePath || undefined,
                    })
                    setPicker("url", url)
                    setStatus({ tone: "ok", text: "Provider picker URL prepared." })
                  })
                }
              >
                Build Picker
              </button>
              <button
                class={buttonClass}
                disabled={!picker.url || loading()}
                onClick={() => run("Opening workspace picker...", async () => client()!.openPickerURL(picker.url))}
              >
                Open Picker
              </button>
            </div>
            <Field label="Connection ID">
              <input class={inputClass} value={picker.connectionID} onInput={(event) => setPicker("connectionID", event.currentTarget.value)} />
            </Field>
            <Field label="Token Vault Ref">
              <input class={inputClass} value={picker.tokenVaultRef} onInput={(event) => setPicker("tokenVaultRef", event.currentTarget.value)} />
            </Field>
            <div class="grid grid-cols-2 gap-2">
              <Field label="Provider">
                <select class={inputClass} value={picker.provider} onInput={(event) => setPicker("provider", event.currentTarget.value as LegalCode.WorkspaceProvider)}>
                  <For each={providerOptions}>{(provider) => <option value={provider}>{provider}</option>}</For>
                </select>
              </Field>
              <Field label="App">
                <select class={inputClass} value={picker.app} onInput={(event) => setPicker("app", event.currentTarget.value as LegalCode.WorkspaceApp)}>
                  <For each={appOptions}>{(app) => <option value={app}>{app}</option>}</For>
                </select>
              </Field>
            </div>
            <Field label="External File ID">
              <input class={inputClass} value={picker.externalID} onInput={(event) => setPicker("externalID", event.currentTarget.value)} />
            </Field>
            <Field label="SharePoint Site ID">
              <input class={inputClass} value={picker.siteID} onInput={(event) => setPicker("siteID", event.currentTarget.value)} />
            </Field>
            <Field label="Picker Search">
              <input class={inputClass} value={picker.query} onInput={(event) => setPicker("query", event.currentTarget.value)} />
            </Field>
            <div class="grid grid-cols-2 gap-2">
              <Field label="SharePoint Host">
                <input class={inputClass} value={picker.sharePointHost} placeholder="tenant.sharepoint.com" onInput={(event) => setPicker("sharePointHost", event.currentTarget.value)} />
              </Field>
              <Field label="SharePoint Path">
                <input class={inputClass} value={picker.sharePointSitePath} placeholder="/sites/legal/Shared Documents" onInput={(event) => setPicker("sharePointSitePath", event.currentTarget.value)} />
              </Field>
            </div>
            <Field label="Selected File Callback">
              <input class={inputClass} value={picker.callbackURL} onInput={(event) => setPicker("callbackURL", event.currentTarget.value)} />
            </Field>
            <div class="grid grid-cols-2 gap-2">
              <button
                class={buttonClass}
                disabled={!picker.externalID || loading()}
                onClick={() =>
                  run("Building selected-file callback...", async () => {
                    const url = client()!.selectedFileCallbackURL({
                      provider: picker.provider,
                      app: picker.app,
                      externalID: picker.externalID,
                      siteID: picker.siteID || undefined,
                    })
                    setPicker("callbackURL", url)
                    setStatus({ tone: "ok", text: "Selected-file callback prepared." })
                  })
                }
              >
                Build Callback
              </button>
              <button
                class={buttonClass}
                disabled={!picker.callbackURL || loading()}
                onClick={() =>
                  run("Applying selected-file callback...", async () => {
                    handleWorkspaceLinks([picker.callbackURL])
                  })
                }
              >
                Apply Callback
              </button>
            </div>
            <button
              class={buttonClass}
              disabled={!matter.matterID || !picker.connectionID || !picker.tokenVaultRef || !picker.externalID || loading()}
              onClick={() =>
                run("Importing selected workspace artifact...", async () => {
                  const imported = await client()!.importSelectedFile({
                    matterID: matterID(),
                    connectionID: picker.connectionID as LegalCode.WorkspaceConnectionID,
                    provider: picker.provider,
                    app: picker.app,
                    tokenVaultRef: picker.tokenVaultRef as LegalCode.WorkspaceTokenVaultRef,
                    externalID: picker.externalID,
                    siteID: picker.siteID || undefined,
                    actor: actor(),
                  })
                  if (imported.artifact) {
                    selectArtifact(imported.artifact, picker.tokenVaultRef)
                  }
                  setStatus({ tone: "ok", text: imported.artifact ? "Artifact imported and bound to this matter." : "Import planned." })
                  await refreshMatter()
                })
              }
            >
              Import
            </button>
          </Section>
        </aside>

        <section class="min-h-0 overflow-auto px-6 py-4">
          <div class="grid gap-4 xl:grid-cols-2">
            <Section title="Matter Workspace Records">
              <RecordList title="Connections" empty="No connections for this matter yet." items={connections()}>
                {(item) => (
                  <button class={recordClass} onClick={() => {
                    setPicker("connectionID", item.id)
                    if (item.tokenVaultRef) setPicker("tokenVaultRef", item.tokenVaultRef)
                    setReadback("connectionID", item.id)
                    if (item.tokenVaultRef) setReadback("tokenVaultRef", item.tokenVaultRef)
                  }}>
                    <span>{item.provider}</span>
                    <small>{item.accountEmail ?? item.accountLabel ?? item.id}</small>
                  </button>
                )}
              </RecordList>
              <RecordList title="Artifacts" empty="No imported workspace artifacts yet." items={artifacts()}>
                {(item) => (
                  <button class={recordClass} onClick={() => selectArtifact(item)}>
                    <span>{item.title}</span>
                    <small>{item.syncStatus} - {item.revision ?? item.etag ?? item.externalID}</small>
                  </button>
                )}
              </RecordList>
            </Section>

            <Section title="Read From Workspace">
              <div class="grid grid-cols-2 gap-2">
                <Field label="Connection ID">
                  <input class={inputClass} value={readback.connectionID} onInput={(event) => setReadback("connectionID", event.currentTarget.value)} />
                </Field>
                <Field label="External Artifact ID">
                  <input class={inputClass} value={readback.externalArtifactID} onInput={(event) => setReadback("externalArtifactID", event.currentTarget.value)} />
                </Field>
              </div>
              <Field label="Token Vault Ref">
                <input class={inputClass} value={readback.tokenVaultRef} onInput={(event) => setReadback("tokenVaultRef", event.currentTarget.value)} />
              </Field>
              <div class="grid grid-cols-2 gap-2">
                <Field label="Provider">
                  <select class={inputClass} value={readback.provider} onInput={(event) => setReadback("provider", event.currentTarget.value as LegalCode.WorkspaceProvider)}>
                    <For each={providerOptions}>{(provider) => <option value={provider}>{provider}</option>}</For>
                  </select>
                </Field>
                <Field label="App">
                  <select class={inputClass} value={readback.app} onInput={(event) => setReadback("app", event.currentTarget.value as LegalCode.WorkspaceApp)}>
                    <For each={appOptions}>{(app) => <option value={app}>{app}</option>}</For>
                  </select>
                </Field>
              </div>
              <Field label="Resource ID">
                <input class={inputClass} value={readback.resourceID} onInput={(event) => setReadback("resourceID", event.currentTarget.value)} />
              </Field>
              <div class="grid grid-cols-2 gap-2">
                <Field label="SharePoint Site ID">
                  <input class={inputClass} value={readback.siteID} onInput={(event) => setReadback("siteID", event.currentTarget.value)} />
                </Field>
                <Field label="Workspace Path">
                  <input class={inputClass} value={readback.workspacePath} placeholder="/content" onInput={(event) => setReadback("workspacePath", event.currentTarget.value)} />
                </Field>
              </div>
              <button
                class={buttonClass}
                disabled={!matter.matterID || !readback.connectionID || !readback.tokenVaultRef || !readback.resourceID || loading()}
                onClick={() =>
                  run("Reading workspace artifact through the encrypted token vault...", async () => {
                    const response = await client()!.executeWithVault({
                      matterID: matterID(),
                      connectionID: readback.connectionID as LegalCode.WorkspaceConnectionID,
                      externalArtifactID: readback.externalArtifactID
                        ? (readback.externalArtifactID as LegalCode.ExternalArtifactID)
                        : undefined,
                      provider: readback.provider,
                      app: readback.app,
                      operation: "read",
                      tokenVaultRef: readback.tokenVaultRef as LegalCode.WorkspaceTokenVaultRef,
                      resourceID: readback.resourceID,
                      siteID: readback.siteID || undefined,
                      workspacePath: readback.workspacePath || undefined,
                      actor: actor(),
                      approval: "not_required",
                      inputSummary: "Matter-scoped LegalCode workspace read.",
                      sourceSpans: [],
                    })
                    setLastRead(response)
                    setStatus({ tone: response.result?.ok === false ? "warn" : "ok", text: "Workspace read operation recorded in matter history." })
                    await refreshMatter()
                  })
                }
              >
                Read
              </button>
              <Show when={readPreview()}>
                {(preview) => (
                  <textarea
                    class={`${inputClass} min-h-32 resize-y py-2 font-mono text-[11px]`}
                    readOnly
                    value={preview()}
                  />
                )}
              </Show>
            </Section>

            <Section title="Approved Writeback">
              <div class="grid grid-cols-2 gap-2">
                <Field label="Connection ID">
                  <input class={inputClass} value={writeback.connectionID} onInput={(event) => setWriteback("connectionID", event.currentTarget.value)} />
                </Field>
                <Field label="External Artifact ID">
                  <input class={inputClass} value={writeback.externalArtifactID} onInput={(event) => setWriteback("externalArtifactID", event.currentTarget.value)} />
                </Field>
              </div>
              <Field label="Token Vault Ref">
                <input class={inputClass} value={writeback.tokenVaultRef} onInput={(event) => setWriteback("tokenVaultRef", event.currentTarget.value)} />
              </Field>
              <div class="grid grid-cols-3 gap-2">
                <Field label="Provider">
                  <select class={inputClass} value={writeback.provider} onInput={(event) => setWriteback("provider", event.currentTarget.value as LegalCode.WorkspaceProvider)}>
                    <For each={providerOptions}>{(provider) => <option value={provider}>{provider}</option>}</For>
                  </select>
                </Field>
                <Field label="App">
                  <select class={inputClass} value={writeback.app} onInput={(event) => setWriteback("app", event.currentTarget.value as LegalCode.WorkspaceApp)}>
                    <For each={appOptions}>{(app) => <option value={app}>{app}</option>}</For>
                  </select>
                </Field>
                <Field label="Operation">
                  <select class={inputClass} value={writeback.operation} onInput={(event) => setWriteback("operation", event.currentTarget.value as LegalCode.WorkspaceOperationKind)}>
                    <For each={operationOptions}>{(operation) => <option value={operation}>{operation}</option>}</For>
                  </select>
                </Field>
              </div>
              <Field label="Resource ID">
                <input class={inputClass} value={writeback.resourceID} onInput={(event) => setWriteback("resourceID", event.currentTarget.value)} />
              </Field>
              <div class="grid grid-cols-3 gap-2">
                <Field label="SharePoint Site ID">
                  <input class={inputClass} value={writeback.siteID} onInput={(event) => setWriteback("siteID", event.currentTarget.value)} />
                </Field>
                <Field label="Workspace Path">
                  <input class={inputClass} value={writeback.workspacePath} placeholder="/content" onInput={(event) => setWriteback("workspacePath", event.currentTarget.value)} />
                </Field>
                <Field label="HTTP Method">
                  <input class={inputClass} value={writeback.httpMethod} placeholder="POST" onInput={(event) => setWriteback("httpMethod", event.currentTarget.value)} />
                </Field>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <Field label="Audit Event ID">
                  <input class={inputClass} value={writeback.auditEventID} onInput={(event) => setWriteback("auditEventID", event.currentTarget.value)} />
                </Field>
                <Field label="Source ID">
                  <input class={inputClass} value={writeback.sourceID} onInput={(event) => setWriteback("sourceID", event.currentTarget.value)} />
                </Field>
              </div>
              <Field label="Approved Content / JSON">
                <textarea class={`${inputClass} min-h-24 resize-y py-2`} value={writeback.content} onInput={(event) => setWriteback("content", event.currentTarget.value)} />
              </Field>
              <div class="grid grid-cols-3 gap-2">
                <button
                  class={buttonClass}
                  disabled={!matter.matterID || !writeback.externalArtifactID || !writeback.tokenVaultRef || loading()}
                  onClick={() =>
                    run("Checking workspace conflict status...", async () => {
                      const conflict = await client()!.checkConflict({
                        matterID: matterID(),
                        externalArtifactID: writeback.externalArtifactID as LegalCode.ExternalArtifactID,
                        tokenVaultRef: writeback.tokenVaultRef as LegalCode.WorkspaceTokenVaultRef,
                        actor: actor(),
                      })
                      setLastConflict(conflict)
                      setStatus({
                        tone: conflict.status === "clean" ? "ok" : "warn",
                        text: `Conflict status: ${conflict.status}. ${conflict.conflictReasons.join(" ")}`,
                      })
                    })
                  }
                >
                  Check Conflict
                </button>
                <button
                  class={buttonClass}
                  disabled={
                    !matter.matterID ||
                    !writeback.connectionID ||
                    !writeback.externalArtifactID ||
                    !writeback.tokenVaultRef ||
                    !writeback.auditEventID ||
                    !writeback.sourceID ||
                    !writeback.resourceID ||
                    !writeback.content.trim() ||
                    (writeback.provider === "microsoft_365" && writeback.app === "sharepoint" && !writeback.siteID) ||
                    loading()
                  }
                  onClick={() =>
                    run("Preparing redacted workspace writeback dry run...", async () => {
                      const response = await client()!.runApprovedWriteback(writebackPayload(true))
                      setLastWritebackPreview(response)
                      setStatus({ tone: "ok", text: "Dry run prepared. Review the redacted provider request before writing." })
                      await refreshMatter()
                    })
                  }
                >
                  Dry Run
                </button>
                <button
                  class={buttonClass}
                  disabled={
                    !matter.matterID ||
                    !writeback.connectionID ||
                    !writeback.externalArtifactID ||
                    !writeback.tokenVaultRef ||
                    !writeback.auditEventID ||
                    !writeback.sourceID ||
                    !writeback.resourceID ||
                    !writeback.content.trim() ||
                    (writeback.provider === "microsoft_365" && writeback.app === "sharepoint" && !writeback.siteID) ||
                    loading()
                  }
                  onClick={() =>
                    run("Running approved workspace writeback...", async () => {
                      await client()!.runApprovedWriteback(writebackPayload(false))
                      setStatus({ tone: "ok", text: "Approved writeback completed after a clean conflict preflight." })
                      await refreshMatter()
                    })
                  }
                >
                  Write Back
                </button>
              </div>
              <Show when={lastConflict()}>
                {(conflict) => (
                  <div class="rounded-[6px] border border-v2-border-border-muted p-3 text-[12px] leading-5 text-v2-text-text-muted">
                    <div>Status: {conflict().status}</div>
                    <div>Operation: {conflict().operation.id}</div>
                    <div>ETag: {conflict().currentETag ?? conflict().storedETag ?? "unknown"}</div>
                  </div>
                )}
              </Show>
              <Show when={writebackPreview()}>
                {(preview) => (
                  <textarea
                    class={`${inputClass} min-h-36 resize-y py-2 font-mono text-[11px]`}
                    readOnly
                    value={preview()}
                  />
                )}
              </Show>
            </Section>

            <Section title="Operation History">
              <RecordList title="Recent Operations" empty="No workspace operations recorded yet." items={operations()}>
                {(item) => (
                  <div class={recordClass}>
                    <span>{item.operation} - {item.status}</span>
                    <small>{item.provider} - {item.app} - {item.id}</small>
                  </div>
                )}
              </RecordList>
            </Section>
          </div>
        </section>
      </div>
    </main>
  )
}

function Field(props: { label: string; children: JSX.Element }) {
  return (
    <label class="grid gap-1 text-[12px] leading-4 text-v2-text-text-muted">
      <span>{props.label}</span>
      {props.children}
    </label>
  )
}

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <section class="grid gap-3 border-b border-v2-border-border-muted py-4 first:pt-0 last:border-b-0">
      <h2 class="text-[13px] leading-5 text-v2-text-text-base [font-weight:620]">{props.title}</h2>
      {props.children}
    </section>
  )
}

function StatusBar(props: { status: Status; loading: boolean }) {
  const tone = () =>
    props.status.tone === "error"
      ? "text-red-500"
      : props.status.tone === "warn"
        ? "text-yellow-500"
        : props.status.tone === "ok"
          ? "text-green-500"
          : "text-v2-text-text-muted"
  return (
    <div class={`self-end rounded-[6px] border border-v2-border-border-muted px-3 py-2 text-[13px] leading-5 ${tone()}`}>
      {props.loading ? "Working..." : props.status.text}
    </div>
  )
}

function RecordList<T>(props: {
  title: string
  empty: string
  items: T[]
  children: (item: T) => JSX.Element
}) {
  return (
    <div class="grid gap-2">
      <div class="text-[12px] text-v2-text-text-muted">{props.title}</div>
      <Show when={props.items.length > 0} fallback={<p class="text-[12px] text-v2-text-text-muted">{props.empty}</p>}>
        <div class="grid gap-1">
          <For each={props.items}>{(item) => props.children(item)}</For>
        </div>
      </Show>
    </div>
  )
}
