import type { LegalCode } from "@opencode-ai/core/legalcode"
import { LegalCodeStore } from "@opencode-ai/core/legalcode-store"
import { LegalCodeTokenVault } from "@opencode-ai/core/legalcode-token-vault"
import { LegalCodeWorkspace } from "@opencode-ai/core/legalcode-workspace"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"
import { InvalidRequestError, ServiceUnavailableError } from "../errors"

const agentRoles: LegalCode.AgentRole[] = [
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

const artifactTypes: LegalCode.ArtifactType[] = [
  "document",
  "sheet",
  "uploaded_file",
  "pleading",
  "evidence",
  "research",
  "agent_output",
  "note",
]

const workspaceProviders: LegalCode.WorkspaceProvider[] = ["google_workspace", "microsoft_365"]

const reliabilityGates = [
  "No filing-ready output without humanApproval: approved.",
  "No verified legal citation without at least one source span.",
  "No deadline may move beyond proposed/partially verified without a rule, triggering event, date, service method, and lawyer approval.",
  "No agent action may omit context artifacts/sources from its provenance record.",
  "No workspace write/edit/export operation may run without matter scope, explicit user approval, and an audit event.",
]

const jurisdictions: LegalCode.JurisdictionPack[] = [
  {
    jurisdiction: "us",
    name: "US Litigation",
    status: "active",
    citationFormats: [
      "Bluebook case citations with court and year",
      "Federal Rules of Civil Procedure as Fed. R. Civ. P. <rule>",
      "Federal Rules of Evidence as Fed. R. Evid. <rule>",
      "Local rules by court-specific abbreviation when available",
    ],
    pleadingTemplates: [
      "complaint",
      "answer",
      "motion",
      "memorandum of law",
      "declaration",
      "proposed order",
      "certificate of service",
      "demand letter",
    ],
    deadlineRules: [
      "Do not calculate a deadline without forum, triggering event, service method, and source rule/order.",
      "Mark all extracted dates as proposed until lawyer-verified.",
      "Flag weekends, court holidays, local rules, and ECF-specific cutoffs as verification requirements.",
    ],
    filingChecklist: [
      "Caption",
      "Court and case number",
      "Party names",
      "Signature block",
      "Certificate of service",
      "Exhibits",
      "Declarations",
      "Proposed order when required",
      "Citation verification",
      "Deadline verification",
      "Human approval",
    ],
    researchSourcePreferences: [
      "Provided case files and orders",
      "Official court rules and local rules",
      "Official statutes and regulations",
      "Court opinions from official or reliable sources",
      "Secondary sources only as research leads",
    ],
  },
  {
    jurisdiction: "india",
    name: "India Litigation",
    status: "planned",
    citationFormats: [
      "SCC citations when available",
      "AIR citations when available",
      "Neutral citations when available",
      "Court and year must be included when citation certainty is incomplete",
    ],
    pleadingTemplates: [
      "plaint",
      "written statement",
      "interlocutory application",
      "affidavit",
      "vakalatnama checklist",
      "notice",
      "petition",
    ],
    deadlineRules: [
      "Do not calculate limitation or procedural deadlines without forum, statute/rule, triggering event, and date.",
      "Mark all extracted dates as proposed until lawyer-verified.",
      "Flag court vacations, registry defects, limitation extensions, and local practice as verification requirements.",
    ],
    filingChecklist: [
      "Cause title",
      "Court/forum",
      "Party details",
      "Jurisdiction facts",
      "Valuation and court fee assumptions",
      "Affidavit/verifications",
      "Annexures",
      "Vakalatnama/authorization",
      "Citation verification",
      "Limitation verification",
      "Human approval",
    ],
    researchSourcePreferences: [
      "Provided matter documents",
      "Official statutes, rules, and court websites",
      "Supreme Court and High Court judgments from reliable sources",
      "Tribunal materials where relevant",
      "Secondary sources only as research leads",
    ],
  },
]

const workspaceProfiles: LegalCode.WorkspaceIntegrationProfile[] = [
  {
    provider: "google_workspace",
    label: "Google Workspace",
    status: "available",
    apps: ["google_drive", "google_docs", "google_sheets"],
    authType: "oauth_device_or_browser",
    readOperations: ["read", "import", "sync"],
    writeOperations: ["write", "export"],
    editOperations: ["edit", "comment", "suggest"],
    defaultScopes: [
      {
        provider: "google_workspace",
        scope: "openid email profile",
        purpose: "Identify the signed-in Google Workspace user and display the account connected to a LegalCode matter.",
        requiredFor: ["read", "write", "edit", "sync"],
        sensitive: false,
        adminConsentLikely: false,
      },
      {
        provider: "google_workspace",
        scope: "https://www.googleapis.com/auth/drive.file",
        purpose: "Read, create, edit, and delete only Google Drive files the user opens with or creates from LegalCode.",
        requiredFor: ["read", "write", "edit", "import", "export", "sync"],
        sensitive: true,
        adminConsentLikely: false,
      },
      {
        provider: "google_workspace",
        scope: "https://www.googleapis.com/auth/documents",
        purpose: "Read and update Google Docs content for legal drafting, comments, suggestions, and exports.",
        requiredFor: ["read", "write", "edit", "comment", "suggest", "export"],
        sensitive: true,
        adminConsentLikely: false,
      },
      {
        provider: "google_workspace",
        scope: "https://www.googleapis.com/auth/spreadsheets",
        purpose: "Read and update Google Sheets for evidence registers, deadlines, discovery trackers, and issue logs.",
        requiredFor: ["read", "write", "edit", "export", "sync"],
        sensitive: true,
        adminConsentLikely: false,
      },
    ],
    riskControls: [
      "Prefer drive.file over full-drive access for solo-litigator matters.",
      "Bind every imported or exported file to a matter before agents may read it.",
      "Treat Docs and Sheets edits as suggestions until a human approves the operation.",
      "Record source spans for imported excerpts and audit events for every write/edit/export.",
    ],
  },
  {
    provider: "microsoft_365",
    label: "Microsoft 365",
    status: "available",
    apps: ["one_drive", "sharepoint", "word", "excel"],
    authType: "admin_consent_oauth",
    readOperations: ["read", "import", "sync"],
    writeOperations: ["write", "export"],
    editOperations: ["edit", "comment", "suggest"],
    defaultScopes: [
      {
        provider: "microsoft_365",
        scope: "openid profile email offline_access User.Read",
        purpose: "Identify the signed-in Microsoft 365 user and refresh delegated access for matter workspace sync.",
        requiredFor: ["read", "write", "edit", "sync"],
        sensitive: false,
        adminConsentLikely: false,
      },
      {
        provider: "microsoft_365",
        scope: "Files.ReadWrite",
        purpose: "Read, create, update, and delete files in the signed-in user's OneDrive scope.",
        requiredFor: ["read", "write", "edit", "import", "export", "sync"],
        sensitive: true,
        adminConsentLikely: false,
      },
      {
        provider: "microsoft_365",
        scope: "Files.ReadWrite.All",
        purpose: "Read and write all files the signed-in user can access when a matter is linked to shared libraries.",
        requiredFor: ["read", "write", "edit", "import", "export", "sync"],
        sensitive: true,
        adminConsentLikely: false,
      },
      {
        provider: "microsoft_365",
        scope: "Sites.ReadWrite.All",
        purpose: "Read and write SharePoint document libraries selected for a matter workspace.",
        requiredFor: ["read", "write", "edit", "import", "export", "sync"],
        sensitive: true,
        adminConsentLikely: true,
      },
    ],
    riskControls: [
      "Prefer Files.ReadWrite for OneDrive-only matters before requesting tenant-wide file scopes.",
      "Require admin consent review before enabling SharePoint-wide matter libraries.",
      "Bind Word and Excel files to matter artifacts before agent reads are permitted.",
      "Require human approval and audit events for Graph write/edit/export calls.",
    ],
  },
]

const workspaceOperationPlans: LegalCode.WorkspaceOperationPlan[] = [
  {
    provider: "google_workspace",
    app: "google_drive",
    operation: "read",
    method: "GET",
    endpointTemplate: "https://www.googleapis.com/drive/v3/files/{fileId}?fields=id,name,mimeType,webViewLink,modifiedTime,version,md5Checksum",
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    approvalRequired: false,
    auditEventRequired: true,
    sourceSpanRequired: false,
    description: "Read Drive file metadata before linking the file to a LegalCode matter.",
  },
  {
    provider: "google_workspace",
    app: "google_docs",
    operation: "edit",
    method: "POST",
    endpointTemplate: "https://docs.googleapis.com/v1/documents/{documentId}:batchUpdate",
    requiredScopes: ["https://www.googleapis.com/auth/documents"],
    approvalRequired: true,
    auditEventRequired: true,
    sourceSpanRequired: true,
    description: "Apply lawyer-approved insertions, replacements, comments, or suggestions to a Google Doc.",
  },
  {
    provider: "google_workspace",
    app: "google_sheets",
    operation: "edit",
    method: "POST",
    endpointTemplate: "https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}:batchUpdate",
    requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
    approvalRequired: true,
    auditEventRequired: true,
    sourceSpanRequired: true,
    description: "Update structured legal sheets such as evidence registers, deadline trackers, and issue logs.",
  },
  {
    provider: "microsoft_365",
    app: "one_drive",
    operation: "read",
    method: "GET",
    endpointTemplate: "https://graph.microsoft.com/v1.0/me/drive/items/{itemId}",
    requiredScopes: ["Files.ReadWrite"],
    approvalRequired: false,
    auditEventRequired: true,
    sourceSpanRequired: false,
    description: "Read OneDrive item metadata before importing or linking a matter artifact.",
  },
  {
    provider: "microsoft_365",
    app: "word",
    operation: "edit",
    method: "PUT/PATCH",
    endpointTemplate: "https://graph.microsoft.com/v1.0/me/drive/items/{itemId}/content",
    requiredScopes: ["Files.ReadWrite"],
    approvalRequired: true,
    auditEventRequired: true,
    sourceSpanRequired: true,
    description: "Write a lawyer-approved Word document revision back to OneDrive or a selected document library.",
  },
  {
    provider: "microsoft_365",
    app: "excel",
    operation: "edit",
    method: "PATCH/POST",
    endpointTemplate: "https://graph.microsoft.com/v1.0/me/drive/items/{itemId}/workbook",
    requiredScopes: ["Files.ReadWrite"],
    approvalRequired: true,
    auditEventRequired: true,
    sourceSpanRequired: true,
    description: "Update Excel-backed legal trackers through Microsoft Graph workbook endpoints.",
  },
  {
    provider: "microsoft_365",
    app: "sharepoint",
    operation: "sync",
    method: "GET/PATCH",
    endpointTemplate: "https://graph.microsoft.com/v1.0/sites/{siteId}/drive/items/{itemId}",
    requiredScopes: ["Sites.ReadWrite.All"],
    approvalRequired: true,
    auditEventRequired: true,
    sourceSpanRequired: true,
    description: "Synchronize selected SharePoint document-library files with LegalCode matter artifacts.",
  },
]

export const LegalCodeHandler = HttpApiBuilder.group(Api, "server.legalcode", (handlers) =>
  handlers
    .handle("legalcode.capabilities", () =>
      Effect.succeed({
        data: {
          primaryCustomer: "us_solo_litigator" as const,
          posture: "human_in_the_loop_supervised_automation" as const,
          deployment: "local_first_cloud_sync" as const,
          agentRoles: [...agentRoles],
          artifactTypes: [...artifactTypes],
          workspaceProviders: [...workspaceProviders],
          reliabilityGates,
        },
      }),
    )
    .handle("legalcode.jurisdictions", () => Effect.succeed({ data: [...jurisdictions] }))
    .handle("legalcode.workspace-integrations", () =>
      Effect.succeed({
        data: {
          profiles: workspaceProfiles.map((profile) => ({
            ...profile,
            apps: [...profile.apps],
            readOperations: [...profile.readOperations],
            writeOperations: [...profile.writeOperations],
            editOperations: [...profile.editOperations],
            defaultScopes: profile.defaultScopes.map((scope) => ({
              ...scope,
              requiredFor: [...scope.requiredFor],
            })),
            riskControls: [...profile.riskControls],
          })),
          operationPlans: workspaceOperationPlans.map((plan) => ({
            ...plan,
            requiredScopes: [...plan.requiredScopes],
          })),
        },
      }),
    )
    .handle("legalcode.workspace.oauth.authorize", (ctx) =>
      Effect.succeed({
        data: LegalCodeWorkspace.authorizationURL(ctx.payload),
      }),
    )
    .handle("legalcode.workspace.oauth.token", (ctx) =>
      Effect.tryPromise({
        try: () => LegalCodeWorkspace.exchangeToken(ctx.payload),
        catch: (error) => workspaceError(error, "Workspace token exchange failed"),
      }).pipe(Effect.map((data) => ({ data }))),
    )
    .handle(
      "legalcode.workspace.token.store",
      Effect.fn(function* (ctx) {
        const vault = yield* LegalCodeTokenVault.Service
        return { data: yield* vault.store(ctx.payload) }
      }),
    )
    .handle(
      "legalcode.workspace.token.list",
      Effect.fn(function* (ctx) {
        const vault = yield* LegalCodeTokenVault.Service
        return { data: yield* vault.list(ctx.query.provider) }
      }),
    )
    .handle(
      "legalcode.workspace.token.remove",
      Effect.fn(function* (ctx) {
        const vault = yield* LegalCodeTokenVault.Service
        yield* vault.remove(ctx.params.ref)
        return { ok: true }
      }),
    )
    .handle(
      "legalcode.workspace.connection.create",
      Effect.fn(function* (ctx) {
        const store = yield* LegalCodeStore.Service
        return { data: yield* store.createConnection(ctx.payload) }
      }),
    )
    .handle(
      "legalcode.workspace.connection.list",
      Effect.fn(function* (ctx) {
        const store = yield* LegalCodeStore.Service
        return { data: yield* store.listConnections(ctx.query) }
      }),
    )
    .handle(
      "legalcode.workspace.artifact.link",
      Effect.fn(function* (ctx) {
        const store = yield* LegalCodeStore.Service
        return { data: yield* store.linkExternalArtifact(ctx.payload) }
      }),
    )
    .handle(
      "legalcode.workspace.artifact.list",
      Effect.fn(function* (ctx) {
        const store = yield* LegalCodeStore.Service
        return { data: yield* store.listExternalArtifacts(ctx.query) }
      }),
    )
    .handle(
      "legalcode.workspace.operation.list",
      Effect.fn(function* (ctx) {
        const store = yield* LegalCodeStore.Service
        return { data: yield* store.listOperations(ctx.query) }
      }),
    )
    .handle("legalcode.workspace.execute", (ctx) =>
      Effect.tryPromise({
        try: () => LegalCodeWorkspace.execute(ctx.payload),
        catch: (error) => workspaceError(error, "Workspace operation failed"),
      }).pipe(
        Effect.flatMap((data) =>
          Effect.gen(function* () {
            const store = yield* LegalCodeStore.Service
            yield* store.recordOperation({ operation: data.operation, result: data.result })
            return { data }
          }),
        ),
      ),
    )
    .handle(
      "legalcode.workspace.execute.withVault",
      Effect.fn(function* (ctx) {
        const vault = yield* LegalCodeTokenVault.Service
        const token = yield* vault.get(ctx.payload.tokenVaultRef)
        if (!token) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: `Token vault reference not found: ${ctx.payload.tokenVaultRef}`,
              kind: "legalcode_workspace",
              field: "tokenVaultRef",
            }),
          )
        }
        if (token.provider !== ctx.payload.provider) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: `Token vault provider ${token.provider} does not match requested provider ${ctx.payload.provider}`,
              kind: "legalcode_workspace",
              field: "provider",
            }),
          )
        }
        const data = yield* Effect.tryPromise({
          try: () =>
            LegalCodeWorkspace.execute({
              ...ctx.payload,
              accessToken: token.accessToken,
            }),
          catch: (error) => workspaceError(error, "Workspace operation failed"),
        })
        const store = yield* LegalCodeStore.Service
        yield* store.recordOperation({ operation: data.operation, result: data.result })
        return { data }
      }),
    ),
)

function workspaceError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  if (
    message.startsWith("Unsupported") ||
    message.includes("Workspace paths") ||
    message.includes("approval") ||
    message.includes("required")
  ) {
    return new InvalidRequestError({ message, kind: "legalcode_workspace" })
  }
  return new ServiceUnavailableError({ message, service: "legalcode_workspace" })
}
