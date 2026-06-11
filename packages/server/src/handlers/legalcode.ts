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

const litigationWorkflows: LegalCode.LitigationWorkflowKind[] = [
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

const legalSheetTypes: LegalCode.LegalSheetKind[] = [
  "issue_log",
  "evidence_register",
  "discovery_tracker",
  "deadline_tracker",
  "damages_table",
  "privilege_log",
  "obligation_tracker",
  "diligence_request_list",
  "clause_matrix",
  "risk_register",
]

const workspaceProviders: LegalCode.WorkspaceProvider[] = ["google_workspace", "microsoft_365"]

const sourceRegistry: LegalCode.SourceRegistryPolicy = {
  ossCredentialMode: "bring_your_own_key_or_account",
  bundledPaidDataAllowed: false,
  defaultAuthorityOrder: [
    "matter_record",
    "official_primary",
    "open_primary",
    "licensed_secondary",
    "unofficial_secondary",
    "unknown",
  ],
  requiredMetadata: [
    "source_type",
    "jurisdiction",
    "authority_level",
    "locator",
    "retrieved_at",
    "hash",
    "parser",
    "license_or_terms",
    "source_spans",
    "verification_status",
    "freshness",
  ],
  acceptanceCriteria: [
    "No OSS build ships paid legal data or shared vendor credentials.",
    "Every source imported into a matter records authority level, retrieval time, hash, and license or terms note.",
    "Every generated legal claim links to source spans or remains explicitly unresolved.",
    "Every account-based source uses a user-provided key, OAuth grant, account session, or manual upload.",
  ],
}

const computerUse: LegalCode.ComputerUsePolicy = {
  mode: "supervised_byok",
  allowedActions: [
    "navigate approved legal research, court, filing, and workspace sites",
    "download user-authorized public or account-accessible documents",
    "check docket updates and official rules pages",
    "capture screenshots and page text into matter audit events",
    "prepare filing or portal forms for human review",
  ],
  prohibitedActions: [
    "submit filings without the user's final click",
    "bypass CAPTCHA, access controls, paywalls, or rate limits",
    "store passwords outside the encrypted local vault or OS credential store",
    "access sealed, restricted, or privileged materials without explicit user authorization",
    "scrape licensed research systems at scale or against terms",
    "upload or share matter documents without human approval",
  ],
  approvalRequiredFor: [
    "login",
    "paid download",
    "document upload",
    "filing submission",
    "external writeback",
    "capturing restricted matter content",
  ],
  credentialRules: [
    "Use user-owned accounts and keys only.",
    "Keep credentials in the encrypted vault or OS keychain.",
    "Never commit, bundle, proxy, or relay shared LegalCode credentials in OSS builds.",
  ],
  auditEvents: [
    "computer_use_session_started",
    "computer_use_navigation",
    "computer_use_download",
    "computer_use_upload_prepared",
    "computer_use_form_prepared",
    "computer_use_human_approval",
    "computer_use_session_ended",
  ],
  sourceImportRules: [
    "Downloaded files become matter sources only after hash, locator, retrieval time, and authority level are recorded.",
    "Screenshots and extracted page text must be marked derived and linked to the visible URL or file locator.",
    "Portal actions that create legal risk must remain pending until a human approval marker is present.",
  ],
}

const dataSourceProfiles: LegalCode.LegalDataSourceProfile[] = [
  {
    id: "matter_uploads",
    label: "Matter Uploads",
    tier: "matter",
    authorityLevel: "matter_record",
    jurisdictions: ["us", "india", "other"],
    accessModes: ["local_file", "manual_upload"],
    credentialMode: "manual_upload",
    bundledCredentialsAllowed: false,
    credentialEnvVars: [],
    allowedUses: ["facts", "evidence", "contracts", "pleadings", "correspondence", "medical_records", "billing_records"],
    prohibitedUses: ["treating extracted text as verified when OCR confidence or source spans are missing"],
    auditRequired: true,
    sourceSpanSupport: "derived",
    freshness: "user supplied; update when the user imports a new version",
    notes: ["Primary fact source for matter-specific work."],
  },
  {
    id: "govinfo",
    label: "GovInfo",
    tier: "official_primary",
    authorityLevel: "official_primary",
    jurisdictions: ["us"],
    accessModes: ["public_api", "api_key"],
    credentialMode: "bring_your_own_key",
    bundledCredentialsAllowed: false,
    baseURL: "https://api.govinfo.gov",
    credentialEnvVars: ["LEGALCODE_GOVINFO_API_KEY"],
    allowedUses: ["federal_statutes", "federal_regulations", "congressional_materials", "official_publications"],
    prohibitedUses: ["presenting current-law conclusions without checking currency and effective date"],
    auditRequired: true,
    sourceSpanSupport: "native",
    freshness: "check provider package date and retrieval time",
    notes: ["OSS builds must require the user to supply any GovInfo API key."],
  },
  {
    id: "federal_register_ecfr",
    label: "Federal Register and eCFR",
    tier: "official_primary",
    authorityLevel: "official_primary",
    jurisdictions: ["us"],
    accessModes: ["public_api"],
    credentialMode: "none_required",
    bundledCredentialsAllowed: false,
    baseURL: "https://www.federalregister.gov",
    credentialEnvVars: [],
    allowedUses: ["agency_rules", "proposed_rules", "notices", "current_regulatory_text"],
    prohibitedUses: ["using proposed rules as binding authority without labeling status"],
    auditRequired: true,
    sourceSpanSupport: "native",
    freshness: "check publication date, effective date, and retrieval time",
    notes: ["Prefer official API/page locators over secondary summaries."],
  },
  {
    id: "courtlistener_recap",
    label: "CourtListener and RECAP",
    tier: "open_primary",
    authorityLevel: "open_primary",
    jurisdictions: ["us"],
    accessModes: ["public_api", "api_key"],
    credentialMode: "bring_your_own_key",
    bundledCredentialsAllowed: false,
    baseURL: "https://www.courtlistener.com",
    credentialEnvVars: ["LEGALCODE_COURTLISTENER_API_KEY"],
    allowedUses: ["opinions", "dockets", "recap_filings", "citations", "docket_alerts"],
    prohibitedUses: ["treating missing RECAP documents as proof a filing does not exist"],
    auditRequired: true,
    sourceSpanSupport: "derived",
    freshness: "check docket entry date, upload date, and retrieval time",
    notes: ["Use before PACER when RECAP already has a free copy."],
  },
  {
    id: "pacer",
    label: "PACER",
    tier: "official_primary",
    authorityLevel: "official_primary",
    jurisdictions: ["us"],
    accessModes: ["user_account", "browser_session"],
    credentialMode: "bring_your_own_account",
    bundledCredentialsAllowed: false,
    baseURL: "https://pacer.uscourts.gov",
    credentialEnvVars: [],
    allowedUses: ["federal_dockets", "federal_filings", "case_locator", "court_opinions"],
    prohibitedUses: ["incurring fees without explicit user approval", "bulk scraping", "bypassing PACER controls"],
    auditRequired: true,
    sourceSpanSupport: "derived",
    freshness: "record docket date, document number, download time, and fee approval",
    notes: ["Use supervised computer use or official PACER developer resources with the user's own account."],
  },
  {
    id: "caselaw_access_project",
    label: "Caselaw Access Project",
    tier: "open_primary",
    authorityLevel: "open_primary",
    jurisdictions: ["us"],
    accessModes: ["public_api"],
    credentialMode: "none_required",
    bundledCredentialsAllowed: false,
    baseURL: "https://case.law",
    credentialEnvVars: [],
    allowedUses: ["historical_case_law", "citation_resolution", "research_leads"],
    prohibitedUses: ["assuming coverage is complete for current docket activity"],
    auditRequired: true,
    sourceSpanSupport: "native",
    freshness: "record decision date, reporter, and retrieval time",
    notes: ["Use coverage notes and jurisdiction metadata when citing cases."],
  },
  {
    id: "licensed_research_byok",
    label: "Licensed Research Platforms",
    tier: "licensed",
    authorityLevel: "licensed_secondary",
    jurisdictions: ["us", "india", "other"],
    accessModes: ["user_account", "browser_session"],
    credentialMode: "bring_your_own_account",
    bundledCredentialsAllowed: false,
    credentialEnvVars: [],
    allowedUses: ["research_with_user_subscription", "citation_checking", "secondary_sources"],
    prohibitedUses: ["scraping at scale", "sharing credentials", "exporting content beyond user license", "training on licensed content"],
    auditRequired: true,
    sourceSpanSupport: "limited",
    freshness: "record provider, visible citation, access time, and user account boundary",
    notes: ["Westlaw, Lexis, Bloomberg Law, Fastcase, vLex, SCC Online, Manupatra, and similar systems are bring-your-own-account only."],
  },
  {
    id: "india_official_sources",
    label: "India Official Legal Sources",
    tier: "official_primary",
    authorityLevel: "official_primary",
    jurisdictions: ["india"],
    accessModes: ["public_api", "browser_session"],
    credentialMode: "none_required",
    credentialEnvVars: [],
    bundledCredentialsAllowed: false,
    allowedUses: ["statutes", "court_orders", "cause_lists", "tribunal_materials", "gazette_materials"],
    prohibitedUses: ["treating unofficial mirrors as official without labeling them"],
    auditRequired: true,
    sourceSpanSupport: "derived",
    freshness: "record court or ministry source, publication date, and retrieval time",
    notes: ["Prefer India Code, eGazette, Supreme Court, High Court, tribunal, and eCourts official sources when available."],
  },
]

const reliabilityGates = [
  "No filing-ready output without humanApproval: approved.",
  "No verified legal citation without at least one source span.",
  "No deadline may move beyond proposed/partially verified without a rule, triggering event, date, service method, and lawyer approval.",
  "No agent action may omit context artifacts/sources from its provenance record.",
  "No workspace write/edit/export operation may run without matter scope, explicit user approval, and an audit event.",
]

const productRoadmap: LegalCode.ProductReliabilityRoadmap = {
  primaryLaunchUser: "us_solo_litigator",
  primaryJurisdiction: "us",
  nextJurisdictions: ["india", "other"],
  posture: "human_in_the_loop_supervised_automation",
  deployment: "local_first_desktop_encrypted_cloud_sync",
  firstWedge: "multi_role_litigation_coworker",
  matterCommandCenter: [
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
  ],
  legalCoworkers: [...agentRoles],
  litigationWorkflows: [...litigationWorkflows],
  trustLayer: {
    sourceSpansRequired: true,
    citationValidationRequired: true,
    quoteVerificationRequired: true,
    factualClaimVerificationRequired: true,
    unresolvedQuestionsRequired: true,
    verifyBeforeFilingStatusRequired: true,
    fakeCitationDetectionRequired: true,
    confidenceRequired: true,
    humanApprovalRequiredForFinal: true,
    acceptanceCriteria: [
      "Every legal or factual claim in a draft carries source spans or an unresolved question.",
      "No citation may be displayed as verified unless it resolves to a stored source.",
      "No quote may be displayed as verified unless the quoted text matches the source span.",
      "No final/export action may proceed without a human approval marker.",
    ],
  },
  documentEngine: {
    foundation: "prosemirror",
    collaboration: "yjs",
    v1Features: [
      "comments",
      "suggestions",
      "version_snapshots",
      "source_anchors",
      "agent_provenance_marks",
      "docx_export",
      "pdf_export",
    ],
    laterFeatures: ["word_tracked_change_round_trip", "advanced_redline_fidelity"],
    exportTargets: ["docx", "pdf"],
  },
  sheetEngine: {
    foundation: "typed_legal_tables",
    collaboration: "yjs",
    sheetKinds: [...legalSheetTypes],
    v1Features: [
      "cell_comments",
      "range_comments",
      "owner_status_severity_date_fields",
      "document_excerpt_links",
      "agent_extraction_provenance",
      "version_snapshots",
    ],
    nonGoals: ["full_excel_formula_parity", "public_link_sharing"],
  },
  agentBroker: {
    requiresMatterScope: true,
    requiresDeclaredReads: true,
    requiresDeclaredOutputs: true,
    allowedOutputKinds: ["draft", "suggestion", "comment", "extraction", "final_candidate"],
    finalOutputRequiresHumanApproval: true,
    auditEveryReadWrite: true,
    unauthorizedContextAccess: "deny",
  },
  collaboration: {
    localFirst: true,
    publicLinksAllowed: false,
    inviteRequired: true,
    encryptedCloudSync: true,
    durableRecords: [
      "matter",
      "artifact",
      "document_revision",
      "sheet_revision",
      "comment_thread",
      "citation",
      "deadline",
      "task",
      "audit_event",
      "agent_action",
    ],
    realtimeSignals: ["presence", "cursor", "selection", "active_cell", "typing", "agent_streaming_state"],
    authority: ["identity", "invites", "permissions", "audit_log", "matter_membership", "version_restore"],
  },
  sourceRegistry,
  computerUse,
  milestones: [
    {
      id: "foundation",
      title: "LegalCode Domain Foundation",
      status: "in_progress",
      summary: "Keep OpenCode runtime primitives while adding matter, artifact, trust, and agent provenance concepts.",
      dependsOn: [],
      acceptanceCriteria: [
        "Core/server expose matter-scoped legal domain contracts.",
        "Agents can declare selected matter reads and intended outputs.",
        "Trust gates are available to UI and workflow runners.",
      ],
    },
    {
      id: "source_registry",
      title: "BYOK Source Registry",
      status: "in_progress",
      summary: "Register matter, official, open, licensed, and browser-derived legal sources with authority levels and source spans.",
      dependsOn: ["foundation"],
      acceptanceCriteria: [
        "OSS builds ship no paid legal data or shared provider credentials.",
        "Every imported source records authority level, locator, retrieval time, hash, terms note, and source span strategy.",
        "Licensed and account-based sources require user-owned keys, OAuth grants, accounts, or manual uploads.",
      ],
    },
    {
      id: "supervised_computer_use",
      title: "Supervised Computer Use",
      status: "planned",
      summary: "Use visible, audited browser sessions for court portals and legal research systems when APIs are unavailable.",
      dependsOn: ["source_registry", "local_storage"],
      acceptanceCriteria: [
        "Computer use cannot submit filings, incur fees, upload documents, or access restricted matter material without human approval.",
        "Downloads and screenshots become matter sources only after audit, hash, retrieval time, and locator capture.",
        "The system never bypasses access controls, CAPTCHA, paywalls, or licensed-source terms.",
      ],
    },
    {
      id: "local_storage",
      title: "Encrypted Local Matter Storage",
      status: "planned",
      summary: "Persist matter metadata, artifact index, extracted text, audit queue, and encrypted cache in local SQLite.",
      dependsOn: ["foundation"],
      acceptanceCriteria: [
        "Matter data is private by default.",
        "External sync remains disabled until the user enables collaboration for a matter.",
        "Every agent read/write can be traced to a local audit event.",
      ],
    },
    {
      id: "document_engine",
      title: "Collaborative Legal Documents",
      status: "planned",
      summary: "Use ProseMirror and Yjs for comments, suggestions, source anchors, snapshots, and export.",
      dependsOn: ["foundation", "local_storage"],
      acceptanceCriteria: [
        "Concurrent edits reconcile without silent data loss.",
        "Agent-drafted text is suggestion-first with provenance.",
        "DOCX/PDF export requires human approval for final versions.",
      ],
    },
    {
      id: "sheet_engine",
      title: "Structured Legal Sheets",
      status: "planned",
      summary: "Ship typed litigation tables before spreadsheet-formula parity.",
      dependsOn: ["foundation", "local_storage"],
      acceptanceCriteria: [
        "Issue logs, evidence registers, discovery trackers, deadlines, damages tables, and privilege logs have typed columns.",
        "Cells and ranges support comments, source links, owner, status, severity, and dates.",
        "Agent extractions include source spans and confidence.",
      ],
    },
    {
      id: "cloud_sync",
      title: "Invite-Based Encrypted Cloud Sync",
      status: "planned",
      summary: "Sync Yjs updates, presence, comments, and audit events after invite-based matter collaboration is enabled.",
      dependsOn: ["document_engine", "sheet_engine"],
      acceptanceCriteria: [
        "Public link sharing is unavailable.",
        "External users only see invited matters and artifacts.",
        "Server remains authority for identity, invites, permissions, audit log, and membership.",
      ],
    },
    {
      id: "jurisdiction_packs",
      title: "Jurisdiction Packs",
      status: "in_progress",
      summary: "Start with US litigation, add India next, and keep rules/templates/source preferences separable by jurisdiction.",
      dependsOn: ["foundation"],
      acceptanceCriteria: [
        "US litigation pack is active.",
        "India litigation pack stays planned until validated.",
        "Deadline rules, citation formats, templates, research sources, and filing checklists are pack-owned.",
      ],
    },
  ],
}

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
          litigationWorkflows: [...litigationWorkflows],
          legalSheetTypes: [...legalSheetTypes],
          workspaceProviders: [...workspaceProviders],
          dataSourceProfiles: dataSourceProfiles.map(copyDataSourceProfile),
          sourceRegistry: copySourceRegistry(),
          computerUse: copyComputerUse(),
          reliabilityGates,
        },
      }),
    )
    .handle("legalcode.product-roadmap", () =>
      Effect.succeed({
        data: {
          ...productRoadmap,
          nextJurisdictions: [...productRoadmap.nextJurisdictions],
          matterCommandCenter: [...productRoadmap.matterCommandCenter],
          legalCoworkers: [...productRoadmap.legalCoworkers],
          litigationWorkflows: [...productRoadmap.litigationWorkflows],
          trustLayer: {
            ...productRoadmap.trustLayer,
            acceptanceCriteria: [...productRoadmap.trustLayer.acceptanceCriteria],
          },
          documentEngine: {
            ...productRoadmap.documentEngine,
            v1Features: [...productRoadmap.documentEngine.v1Features],
            laterFeatures: [...productRoadmap.documentEngine.laterFeatures],
            exportTargets: [...productRoadmap.documentEngine.exportTargets],
          },
          sheetEngine: {
            ...productRoadmap.sheetEngine,
            sheetKinds: [...productRoadmap.sheetEngine.sheetKinds],
            v1Features: [...productRoadmap.sheetEngine.v1Features],
            nonGoals: [...productRoadmap.sheetEngine.nonGoals],
          },
          agentBroker: {
            ...productRoadmap.agentBroker,
            allowedOutputKinds: [...productRoadmap.agentBroker.allowedOutputKinds],
          },
          collaboration: {
            ...productRoadmap.collaboration,
            durableRecords: [...productRoadmap.collaboration.durableRecords],
            realtimeSignals: [...productRoadmap.collaboration.realtimeSignals],
            authority: [...productRoadmap.collaboration.authority],
          },
          sourceRegistry: copySourceRegistry(),
          computerUse: copyComputerUse(),
          milestones: productRoadmap.milestones.map((milestone) => ({
            ...milestone,
            dependsOn: [...milestone.dependsOn],
            acceptanceCriteria: [...milestone.acceptanceCriteria],
          })),
        },
      }),
    )
    .handle("legalcode.source-integrations", () =>
      Effect.succeed({
        data: {
          profiles: dataSourceProfiles.map(copyDataSourceProfile),
          sourceRegistry: copySourceRegistry(),
          computerUse: copyComputerUse(),
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
    .handle("legalcode.workspace.connect.start", (ctx) =>
      Effect.succeed({
        data: LegalCodeWorkspace.startConnection(ctx.payload),
      }),
    )
    .handle("legalcode.workspace.oauth.token", (ctx) =>
      Effect.tryPromise({
        try: () => LegalCodeWorkspace.exchangeToken(ctx.payload),
        catch: (error) => workspaceError(error, "Workspace token exchange failed"),
      }).pipe(Effect.map((data) => ({ data }))),
    )
    .handle(
      "legalcode.workspace.connect.finalize",
      Effect.fn(function* (ctx) {
        const token = yield* Effect.tryPromise({
          try: () =>
            LegalCodeWorkspace.exchangeToken({
              provider: ctx.payload.provider,
              clientID: ctx.payload.clientID,
              redirectURI: ctx.payload.redirectURI,
              code: ctx.payload.code,
              codeVerifier: ctx.payload.codeVerifier,
              clientSecret: ctx.payload.clientSecret,
              tenantID: ctx.payload.tenantID,
            }),
          catch: (error) => workspaceError(error, "Workspace token exchange failed"),
        })
        const scopes = token.scope?.split(/\s+/).filter(Boolean) ?? LegalCodeWorkspace.defaultScopes(ctx.payload.provider)
        const vault = yield* LegalCodeTokenVault.Service
        const stored = yield* vault.store({
          provider: ctx.payload.provider,
          accountEmail: ctx.payload.accountEmail,
          accountLabel: ctx.payload.accountLabel,
          tenantID: ctx.payload.tenantID,
          clientID: ctx.payload.clientID,
          clientSecret: ctx.payload.clientSecret,
          scopes,
          tokenType: token.tokenType,
          expiresIn: token.expiresIn,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          idToken: token.idToken,
        })
        const store = yield* LegalCodeStore.Service
        const connection = yield* store.createConnection({
          matterID: ctx.payload.matterID,
          provider: ctx.payload.provider,
          accountEmail: ctx.payload.accountEmail,
          accountLabel: ctx.payload.accountLabel,
          tenantID: ctx.payload.tenantID,
          domain: ctx.payload.domain,
          status: "connected",
          scopes,
          readEnabled: true,
          writeEnabled: true,
          editEnabled: true,
          tokenVaultRef: stored.ref,
          metadata: {
            authFlow: "oauth_pkce",
            redirectURI: ctx.payload.redirectURI,
          },
        })
        return { data: { provider: ctx.payload.provider, token: stored, connection } }
      }),
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
      "legalcode.workspace.artifact.import",
      Effect.fn(function* (ctx) {
        const vault = yield* LegalCodeTokenVault.Service
        const token = yield* resolveVaultToken({
          vault,
          tokenVaultRef: ctx.payload.tokenVaultRef,
          provider: ctx.payload.provider,
        })

        const data = yield* Effect.tryPromise({
          try: () =>
            LegalCodeWorkspace.importArtifactMetadata({
              ...ctx.payload,
              accessToken: token.accessToken,
            }),
          catch: (error) => workspaceError(error, "Workspace artifact import failed"),
        })
        const store = yield* LegalCodeStore.Service
        yield* store.recordOperation({ operation: data.operation, result: data.result })

        if (data.blockedReasons.length > 0 || ctx.payload.dryRun || !data.result?.ok) {
          return {
            data: {
              operation: data.operation,
              request: data.request,
              result: data.result,
              metadata: {
                importStatus: data.blockedReasons.length > 0 ? "blocked" : ctx.payload.dryRun ? "planned" : "failed",
              },
              blockedReasons: data.blockedReasons,
            },
          }
        }

        const artifactMetadata = LegalCodeWorkspace.normalizeExternalArtifactMetadata(ctx.payload, data.result)
        const artifact = yield* store.linkExternalArtifact({
          matterID: ctx.payload.matterID,
          connectionID: ctx.payload.connectionID,
          provider: ctx.payload.provider,
          app: ctx.payload.app,
          externalID: ctx.payload.externalID,
          ...artifactMetadata,
        })
        return {
          data: {
            artifact,
            operation: data.operation,
            request: data.request,
            result: data.result,
            metadata: artifact.metadata,
            blockedReasons: data.blockedReasons,
          },
        }
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
      "legalcode.workspace.conflict.check",
      Effect.fn(function* (ctx) {
        const store = yield* LegalCodeStore.Service
        const artifact = yield* store.getExternalArtifact(ctx.payload.externalArtifactID)
        if (!artifact) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: `External artifact not found: ${ctx.payload.externalArtifactID}`,
              kind: "legalcode_workspace",
              field: "externalArtifactID",
            }),
          )
        }
        if (artifact.matterID !== ctx.payload.matterID) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: "External artifact does not belong to the requested matter.",
              kind: "legalcode_workspace",
              field: "matterID",
            }),
          )
        }

        const vault = yield* LegalCodeTokenVault.Service
        const token = yield* resolveVaultToken({
          vault,
          tokenVaultRef: ctx.payload.tokenVaultRef,
          provider: artifact.provider,
        })

        const data = yield* Effect.tryPromise({
          try: () =>
            LegalCodeWorkspace.importArtifactMetadata({
              matterID: artifact.matterID,
              connectionID: artifact.connectionID,
              externalArtifactID: artifact.id,
              provider: artifact.provider,
              app: artifact.app,
              tokenVaultRef: ctx.payload.tokenVaultRef,
              externalID: artifact.externalID,
              actor: ctx.payload.actor,
              dryRun: ctx.payload.dryRun,
              accessToken: token.accessToken,
            }),
          catch: (error) => workspaceError(error, "Workspace conflict check failed"),
        })
        yield* store.recordOperation({ operation: data.operation, result: data.result })
        const comparison = LegalCodeWorkspace.checkExternalArtifactConflict(artifact, data.result)
        return {
          data: {
            artifact,
            operation: data.operation,
            request: data.request,
            result: data.result,
            blockedReasons: data.blockedReasons,
            ...comparison,
          },
        }
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
        const token = yield* resolveVaultToken({
          vault,
          tokenVaultRef: ctx.payload.tokenVaultRef,
          provider: ctx.payload.provider,
        })
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

function copyDataSourceProfile(profile: LegalCode.LegalDataSourceProfile): LegalCode.LegalDataSourceProfile {
  return {
    ...profile,
    jurisdictions: [...profile.jurisdictions],
    accessModes: [...profile.accessModes],
    credentialEnvVars: [...profile.credentialEnvVars],
    allowedUses: [...profile.allowedUses],
    prohibitedUses: [...profile.prohibitedUses],
    notes: [...profile.notes],
  }
}

function copySourceRegistry(): LegalCode.SourceRegistryPolicy {
  return {
    ...sourceRegistry,
    defaultAuthorityOrder: [...sourceRegistry.defaultAuthorityOrder],
    requiredMetadata: [...sourceRegistry.requiredMetadata],
    acceptanceCriteria: [...sourceRegistry.acceptanceCriteria],
  }
}

function copyComputerUse(): LegalCode.ComputerUsePolicy {
  return {
    ...computerUse,
    allowedActions: [...computerUse.allowedActions],
    prohibitedActions: [...computerUse.prohibitedActions],
    approvalRequiredFor: [...computerUse.approvalRequiredFor],
    credentialRules: [...computerUse.credentialRules],
    auditEvents: [...computerUse.auditEvents],
    sourceImportRules: [...computerUse.sourceImportRules],
  }
}

const TOKEN_REFRESH_SKEW_SECONDS = 120

const resolveVaultToken = Effect.fn("LegalCodeHandler.resolveVaultToken")(function* (input: {
  vault: LegalCodeTokenVault.Interface
  tokenVaultRef: LegalCode.WorkspaceTokenVaultRef
  provider: LegalCode.WorkspaceProvider
}) {
  const token = yield* input.vault.getRefreshable(input.tokenVaultRef)
  if (!token) {
    return yield* Effect.fail(
      new InvalidRequestError({
        message: `Token vault reference not found: ${input.tokenVaultRef}`,
        kind: "legalcode_workspace",
        field: "tokenVaultRef",
      }),
    )
  }
  if (token.provider !== input.provider) {
    return yield* Effect.fail(
      new InvalidRequestError({
        message: `Token vault provider ${token.provider} does not match requested provider ${input.provider}`,
        kind: "legalcode_workspace",
        field: "provider",
      }),
    )
  }
  if (token.expiresIn === undefined || token.expiresIn > TOKEN_REFRESH_SKEW_SECONDS) return token
  if (!token.refreshToken || !token.clientID) {
    return yield* Effect.fail(
      new InvalidRequestError({
        message: "Workspace token expired and cannot be refreshed. Reconnect this workspace account.",
        kind: "legalcode_workspace",
        field: "tokenVaultRef",
      }),
    )
  }

  const refreshed = yield* Effect.tryPromise({
    try: () =>
      LegalCodeWorkspace.refreshToken({
        provider: token.provider,
        clientID: token.clientID!,
        clientSecret: token.clientSecret,
        tenantID: token.tenantID,
        refreshToken: token.refreshToken!,
        scopes: token.scopes,
      }),
    catch: (error) => workspaceError(error, "Workspace token refresh failed"),
  })
  yield* input.vault.update(input.tokenVaultRef, refreshed)
  return {
    ...token,
    ...refreshed,
    ref: input.tokenVaultRef,
    clientID: token.clientID,
    clientSecret: token.clientSecret,
    tenantID: token.tenantID,
    scopes: refreshed.scope?.split(/\s+/).filter(Boolean) ?? token.scopes,
  }
})

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
