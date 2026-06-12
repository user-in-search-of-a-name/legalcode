import type { LegalCode } from "@opencode-ai/core/legalcode"
import { createEffect, createMemo, createSignal, For, Show, type JSX } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { createLegalCodeMatterOSClient, type LegalCodeMatterOSSnapshot } from "@/legalcode/matter-os-client"
import { usePlatform } from "@/context/platform"
import { useServer } from "@/context/server"

const DOWNLOAD_URL = "https://github.com/user-in-search-of-a-name/legalcode/releases/latest"
const fallbackCoworkers: LegalCode.AgentRole[] = [
  "case_strategist",
  "research_clerk",
  "drafting_clerk",
  "discovery_analyst",
  "citation_checker",
  "deadline_clerk",
  "evidence_chronologist",
  "settlement_analyst",
  "filing_assistant",
  "workspace_integrator",
]
const fallbackWorkflows: LegalCode.LitigationWorkflowKind[] = [
  "complaint_draft",
  "answer_draft",
  "motion_outline",
  "discovery_request_draft",
  "discovery_response_draft",
  "deposition_prep",
  "chronology_builder",
  "issue_memo",
  "exhibit_list",
  "privilege_log",
  "demand_letter",
  "settlement_brief",
  "hearing_prep",
]
const fallbackSheets: LegalCode.LegalSheetKind[] = [
  "issue_log",
  "evidence_register",
  "discovery_tracker",
  "deadline_tracker",
  "damages_table",
  "privilege_log",
]
const fallbackMatterRecords = [
  "parties",
  "claims",
  "deadlines",
  "documents",
  "evidence",
  "research",
  "pleadings",
  "notes",
  "tasks",
  "audit_log",
]
const fallbackTrustCriteria = [
  "Every legal or factual claim in a draft carries source spans or an unresolved question.",
  "No citation may be displayed as verified unless it resolves to a stored source.",
  "No quote may be displayed as verified unless the quoted text matches the source span.",
  "No final/export action may proceed without a human approval marker.",
]

type LoadState = {
  status: "loading" | "ready" | "fallback"
  message: string
}

export default function LegalCodeMatterOSPage() {
  const navigate = useNavigate()
  const platform = usePlatform()
  const server = useServer()
  const [snapshot, setSnapshot] = createSignal<LegalCodeMatterOSSnapshot>()
  const [load, setLoad] = createSignal<LoadState>({
    status: "loading",
    message: "Loading LegalCode capability metadata...",
  })
  const [selectedRole, setSelectedRole] = createSignal<LegalCode.AgentRole>("case_strategist")
  const [selectedWorkflow, setSelectedWorkflow] = createSignal<LegalCode.LitigationWorkflowKind>("complaint_draft")

  const client = createMemo(() => {
    const current = server.current
    if (!current) return
    return createLegalCodeMatterOSClient({ server: current.http, fetch: platform.fetch })
  })
  const roadmap = () => snapshot()?.roadmap
  const roles = () => roadmap()?.legalCoworkers ?? fallbackCoworkers
  const workflows = () => roadmap()?.litigationWorkflows ?? fallbackWorkflows
  const sheets = () => roadmap()?.sheetEngine.sheetKinds ?? fallbackSheets
  const matterRecords = () => roadmap()?.matterCommandCenter ?? fallbackMatterRecords
  const trustCriteria = () => roadmap()?.trustLayer.acceptanceCriteria ?? fallbackTrustCriteria
  const sourceProfiles = () => snapshot()?.sources.profiles ?? []
  const workspaceProfiles = () => snapshot()?.workspace.profiles ?? []
  const jurisdictions = () => snapshot()?.jurisdictions ?? []
  const memoryProviders = () => snapshot()?.memory.providers ?? []
  const selectedPlan = createMemo(() => ({
    role: label(String(selectedRole())),
    workflow: label(String(selectedWorkflow())),
    output: String(selectedWorkflow()).includes("draft")
      ? "Draft"
      : String(selectedWorkflow()).includes("log")
        ? "Legal sheet"
        : "Review packet",
  }))

  createEffect(() => {
    const api = client()
    if (!api) {
      setLoad({ status: "fallback", message: "No LegalCode server connection. Showing the free Matter OS blueprint." })
      return
    }
    setLoad({ status: "loading", message: "Loading LegalCode capability metadata..." })
    api
      .snapshot()
      .then((next) => {
        setSnapshot(next)
        setLoad({ status: "ready", message: "Live LegalCode metadata loaded from the local server." })
      })
      .catch((error) => {
        setLoad({
          status: "fallback",
          message: error instanceof Error ? error.message : "Showing fallback Matter OS blueprint.",
        })
      })
  })

  return (
    <main class="flex h-full min-h-0 flex-col overflow-hidden bg-v2-background-bg-base text-v2-text-text-base">
      <header class="border-b border-v2-border-border-muted px-6 py-4">
        <div class="flex min-w-0 flex-wrap items-center justify-between gap-4">
          <div class="min-w-0">
            <div class="text-[11px] uppercase leading-4 text-v2-text-text-muted [font-weight:560]">LegalCode Matter OS</div>
            <h1 class="mt-1 text-[22px] leading-7 [font-weight:620]">Free legal agent operating system</h1>
            <p class="mt-1 max-w-3xl text-[13px] leading-5 text-v2-text-text-muted">
              Matter-scoped coworkers, legal docs, legal sheets, BYOK sources, workspace connectors, and trust gates in one local-first desktop surface.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class={buttonClass("contrast")} onClick={() => navigate("/new-session")}>
              New legal session
            </button>
            <button class={buttonClass("neutral")} onClick={() => navigate("/legalcode/workspace")}>
              Workspace files
            </button>
            <button class={buttonClass("ghost")} onClick={() => platform.openLink(DOWNLOAD_URL)}>
              Download
            </button>
          </div>
        </div>
      </header>

      <section class="border-b border-v2-border-border-muted px-6 py-3">
        <div class="flex min-w-0 flex-wrap items-center gap-2 text-[12px] leading-4">
          <StatusPill tone={load().status}>{load().status === "ready" ? "Live metadata" : load().status === "loading" ? "Loading" : "Blueprint mode"}</StatusPill>
          <span class="min-w-0 text-v2-text-text-muted">{load().message}</span>
        </div>
      </section>

      <div class="min-h-0 flex-1 overflow-auto px-6 py-5">
        <section class="grid gap-3 xl:grid-cols-4">
          <Metric title="Legal coworkers" value={roles().length} detail="Specialist agents with declared reads and outputs" />
          <Metric title="Litigation workflows" value={workflows().length} detail="Draft, review, chronology, discovery, and hearing prep" />
          <Metric title="Legal sheets" value={sheets().length} detail="Structured work tables instead of generic spreadsheet parity" />
          <Metric title="Trust gates" value={trustCriteria().length} detail="Source spans, citations, quotes, approval, and audit" />
        </section>

        <section class="mt-5 grid gap-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(360px,1.2fr)_minmax(300px,1fr)]">
          <Panel title="Matter Command Center" eyebrow="Local-first matter record">
            <div class="grid grid-cols-2 gap-2">
              <For each={matterRecords()}>
                {(item) => (
                  <div class="rounded-[6px] border border-v2-border-border-muted bg-v2-background-bg-layer-01 px-3 py-2">
                    <div class="text-[13px] leading-5 [font-weight:540]">{label(String(item))}</div>
                    <div class="text-[11px] leading-4 text-v2-text-text-muted">Matter scoped</div>
                  </div>
                )}
              </For>
            </div>
          </Panel>

          <Panel title="Agentic Workflows" eyebrow="Select the coworker and work product">
            <div class="grid gap-3 md:grid-cols-2">
              <Picker title="Coworker">
                <For each={roles()}>
                  {(role) => (
                    <button
                      class={pickerClass(selectedRole() === role)}
                      onClick={() => setSelectedRole(role)}
                    >
                      {label(String(role))}
                    </button>
                  )}
                </For>
              </Picker>
              <Picker title="Workflow">
                <For each={workflows()}>
                  {(workflow) => (
                    <button
                      class={pickerClass(selectedWorkflow() === workflow)}
                      onClick={() => setSelectedWorkflow(workflow)}
                    >
                      {label(String(workflow))}
                    </button>
                  )}
                </For>
              </Picker>
            </div>
            <div class="mt-4 rounded-[8px] border border-v2-border-border-base bg-v2-background-bg-layer-01 p-4">
              <div class="text-[12px] uppercase leading-4 text-v2-text-text-muted [font-weight:560]">Selected legal action</div>
              <div class="mt-1 text-[16px] leading-6 [font-weight:610]">{selectedPlan().workflow}</div>
              <p class="mt-1 text-[13px] leading-5 text-v2-text-text-muted">
                {selectedPlan().role} will prepare a {selectedPlan().output.toLowerCase()} as a lawyer-reviewable candidate with declared matter reads, source anchors, unresolved questions, and human approval before export.
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <button class={buttonClass("contrast")} onClick={() => navigate("/new-session")}>
                  Start with agent
                </button>
                <button class={buttonClass("neutral")} onClick={() => navigate("/legalcode/workspace")}>
                  Attach sources
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Trust Layer" eyebrow="Verify before filing">
            <div class="grid gap-2">
              <For each={trustCriteria()}>
                {(item) => (
                  <div class="rounded-[6px] border border-v2-border-border-muted bg-v2-background-bg-layer-01 px-3 py-2 text-[13px] leading-5">
                    {item}
                  </div>
                )}
              </For>
            </div>
          </Panel>
        </section>

        <section class="mt-4 grid gap-4 xl:grid-cols-3">
          <Panel title="Legal Docs And Sheets" eyebrow="Collaborative work surfaces">
            <div class="grid gap-2">
              <SurfaceRow title="Legal document editor" detail={`${roadmap()?.documentEngine.foundation ?? "ProseMirror"} + ${roadmap()?.documentEngine.collaboration ?? "Yjs"} with comments, suggestions, source anchors, DOCX/PDF export`} />
              <SurfaceRow title="Legal sheet engine" detail={`${roadmap()?.sheetEngine.foundation ?? "Typed legal tables"} + ${roadmap()?.sheetEngine.collaboration ?? "Yjs"} for issue logs, evidence, discovery, deadlines, damages, and privilege`} />
              <div class="flex flex-wrap gap-1.5 pt-1">
                <For each={sheets().slice(0, 8)}>{(sheet) => <Chip>{label(String(sheet))}</Chip>}</For>
              </div>
            </div>
          </Panel>

          <Panel title="BYOK Data Sources" eyebrow="Free OSS source posture">
            <Show
              when={sourceProfiles().length > 0}
              fallback={<EmptyState text="Connect the local LegalCode server to list source profiles. OSS mode stays bring-your-own-key or bring-your-own-account." />}
            >
              <div class="grid gap-2">
                <For each={sourceProfiles().slice(0, 5)}>
                  {(profile) => <SurfaceRow title={profile.label} detail={`${label(String(profile.tier))} - ${label(String(profile.credentialMode))} - ${profile.freshness}`} />}
                </For>
              </div>
            </Show>
          </Panel>

          <Panel title="Governance" eyebrow="Confidential by default">
            <div class="grid gap-2">
              <SurfaceRow title="Collaboration" detail={roadmap()?.collaboration.publicLinksAllowed === false ? "Invite-only matters. No public legal artifact links." : "Invite-based collaboration planned."} />
              <SurfaceRow title="Computer use" detail={snapshot()?.sources.computerUse.mode ? `${label(String(snapshot()!.sources.computerUse.mode))} with approval and audit events` : "Supervised BYOK browser work only."} />
              <SurfaceRow title="Local memory" detail={memoryProviders().length ? memoryProviders().map((provider) => provider.label).join(", ") : "Optional local memory; never a legal authority source."} />
              <SurfaceRow title="Jurisdictions" detail={jurisdictions().length ? jurisdictions().map((pack) => `${pack.name} (${pack.status})`).join(", ") : "US litigation first, India next."} />
              <SurfaceRow title="Workspace" detail={workspaceProfiles().length ? workspaceProfiles().map((profile) => profile.label).join(", ") : "Google Workspace and Microsoft 365 connectors."} />
            </div>
          </Panel>
        </section>
      </div>
    </main>
  )
}

function Panel(props: { title: string; eyebrow: string; children: JSX.Element }) {
  return (
    <section class="min-w-0 rounded-[8px] border border-v2-border-border-base bg-v2-background-bg-base p-4">
      <div class="mb-3">
        <div class="text-[11px] uppercase leading-4 text-v2-text-text-muted [font-weight:560]">{props.eyebrow}</div>
        <h2 class="text-[15px] leading-5 [font-weight:610]">{props.title}</h2>
      </div>
      {props.children}
    </section>
  )
}

function Metric(props: { title: string; value: number; detail: string }) {
  return (
    <div class="rounded-[8px] border border-v2-border-border-base bg-v2-background-bg-layer-01 px-4 py-3">
      <div class="text-[12px] leading-4 text-v2-text-text-muted">{props.title}</div>
      <div class="mt-1 text-[24px] leading-7 [font-weight:640]">{props.value}</div>
      <div class="mt-1 text-[12px] leading-4 text-v2-text-text-muted">{props.detail}</div>
    </div>
  )
}

function Picker(props: { title: string; children: JSX.Element }) {
  return (
    <div class="min-w-0">
      <div class="mb-1.5 text-[12px] leading-4 text-v2-text-text-muted [font-weight:540]">{props.title}</div>
      <div class="flex max-h-[260px] min-w-0 flex-col gap-1 overflow-auto pr-1">{props.children}</div>
    </div>
  )
}

function SurfaceRow(props: { title: string; detail: string }) {
  return (
    <div class="rounded-[6px] border border-v2-border-border-muted bg-v2-background-bg-layer-01 px-3 py-2">
      <div class="text-[13px] leading-5 [font-weight:550]">{props.title}</div>
      <div class="text-[12px] leading-4 text-v2-text-text-muted">{props.detail}</div>
    </div>
  )
}

function EmptyState(props: { text: string }) {
  return <div class="rounded-[6px] border border-v2-border-border-muted px-3 py-2 text-[13px] leading-5 text-v2-text-text-muted">{props.text}</div>
}

function StatusPill(props: { tone: LoadState["status"]; children: JSX.Element }) {
  const muted = "border-v2-border-border-muted bg-v2-background-bg-layer-01 text-v2-text-text-muted"
  return (
    <span
      class="rounded-[4px] border px-2 py-1 text-[11px] leading-3 [font-weight:560]"
      classList={{
        [muted]: props.tone === "loading" || props.tone === "fallback",
        "border-v2-border-border-base bg-v2-background-bg-layer-01 text-v2-text-text-base": props.tone === "ready",
      }}
    >
      {props.children}
    </span>
  )
}

function Chip(props: { children: JSX.Element }) {
  return (
    <span class="rounded-[4px] border border-v2-border-border-muted bg-v2-background-bg-base px-2 py-1 text-[11px] leading-3 text-v2-text-text-muted">
      {props.children}
    </span>
  )
}

function buttonClass(variant: "contrast" | "neutral" | "ghost") {
  const base =
    "min-h-8 rounded-[6px] border px-3 text-[13px] leading-5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-v2-border-border-base"
  if (variant === "contrast") return `${base} border-v2-text-text-base bg-v2-text-text-base text-v2-background-bg-base`
  if (variant === "neutral") return `${base} border-v2-border-border-muted bg-v2-background-bg-layer-01 text-v2-text-text-base hover:bg-v2-overlay-simple-overlay-hover`
  return `${base} border-v2-border-border-muted bg-transparent text-v2-text-text-muted hover:bg-v2-overlay-simple-overlay-hover`
}

function pickerClass(selected: boolean) {
  return [
    "w-full rounded-[6px] border px-3 py-2 text-left text-[13px] leading-5 transition-colors",
    selected
      ? "border-v2-text-text-base bg-v2-background-bg-layer-02 text-v2-text-text-base"
      : "border-v2-border-border-muted bg-v2-background-bg-layer-01 text-v2-text-text-muted hover:bg-v2-overlay-simple-overlay-hover",
  ].join(" ")
}

function label(input: string) {
  return input
    .split("_")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ")
}
