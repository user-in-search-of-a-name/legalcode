export * as LegalCode from "./legalcode"

import { Schema } from "effect"
import { withStatics } from "./schema"
import { Identifier } from "./util/identifier"

const makeID = <const Brand extends string>(prefix: string, brand: Brand) =>
  Schema.String.check(Schema.isStartsWith(`${prefix}_`)).pipe(
    Schema.brand(brand),
    withStatics((schema) => ({
      create: () => schema.make(`${prefix}_${Identifier.ascending()}`),
      ascending: (id?: string) => {
        if (!id) return schema.make(`${prefix}_${Identifier.ascending()}`)
        if (!id.startsWith(`${prefix}_`)) throw new Error(`ID ${id} does not start with ${prefix}_`)
        return schema.make(id)
      },
    })),
  )

export const OrganizationID = makeID("org", "LegalCode.OrganizationID")
export type OrganizationID = typeof OrganizationID.Type

export const MatterID = makeID("mat", "LegalCode.MatterID")
export type MatterID = typeof MatterID.Type

export const ArtifactID = makeID("art", "LegalCode.ArtifactID")
export type ArtifactID = typeof ArtifactID.Type

export const SourceID = makeID("src", "LegalCode.SourceID")
export type SourceID = typeof SourceID.Type

export const CitationID = makeID("cit", "LegalCode.CitationID")
export type CitationID = typeof CitationID.Type

export const DeadlineID = makeID("ddl", "LegalCode.DeadlineID")
export type DeadlineID = typeof DeadlineID.Type

export const TaskID = makeID("tsk", "LegalCode.TaskID")
export type TaskID = typeof TaskID.Type

export const AuditEventID = makeID("aud", "LegalCode.AuditEventID")
export type AuditEventID = typeof AuditEventID.Type

export const AgentActionID = makeID("act", "LegalCode.AgentActionID")
export type AgentActionID = typeof AgentActionID.Type

export const WorkspaceConnectionID = makeID("wcn", "LegalCode.WorkspaceConnectionID")
export type WorkspaceConnectionID = typeof WorkspaceConnectionID.Type

export const ExternalArtifactID = makeID("xar", "LegalCode.ExternalArtifactID")
export type ExternalArtifactID = typeof ExternalArtifactID.Type

export const WorkspaceOperationID = makeID("wop", "LegalCode.WorkspaceOperationID")
export type WorkspaceOperationID = typeof WorkspaceOperationID.Type

export const WorkspaceTokenVaultRef = makeID("tvr", "LegalCode.WorkspaceTokenVaultRef")
export type WorkspaceTokenVaultRef = typeof WorkspaceTokenVaultRef.Type

export const Jurisdiction = Schema.Literals("us", "india", "other")
export type Jurisdiction = typeof Jurisdiction.Type

export const MatterType = Schema.Literals(
  "contract_dispute",
  "employment",
  "landlord_tenant",
  "debt_collection",
  "personal_injury",
  "general_litigation",
)
export type MatterType = typeof MatterType.Type

export const MatterStatus = Schema.Literals("intake", "active", "stayed", "settled", "closed", "archived")
export type MatterStatus = typeof MatterStatus.Type

export const ArtifactType = Schema.Literals(
  "document",
  "sheet",
  "uploaded_file",
  "pleading",
  "evidence",
  "research",
  "agent_output",
  "note",
)
export type ArtifactType = typeof ArtifactType.Type

export const ArtifactStatus = Schema.Literals("draft", "suggested", "verified", "approved", "final", "archived")
export type ArtifactStatus = typeof ArtifactStatus.Type

export const VerificationStatus = Schema.Literals("unverified", "partially_verified", "verified", "rejected")
export type VerificationStatus = typeof VerificationStatus.Type

export const Confidence = Schema.Literals("low", "medium", "high")
export type Confidence = typeof Confidence.Type

export const Role = Schema.Literals("owner", "counsel", "reviewer", "client", "external_counsel", "auditor")
export type Role = typeof Role.Type

export const AgentRole = Schema.Literals(
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
)
export type AgentRole = typeof AgentRole.Type

export const AgentOutputKind = Schema.Literals("draft", "suggestion", "comment", "extraction", "final_candidate")
export type AgentOutputKind = typeof AgentOutputKind.Type

export const HumanApprovalStatus = Schema.Literals("not_required", "required", "approved", "rejected")
export type HumanApprovalStatus = typeof HumanApprovalStatus.Type

export const LitigationWorkflowKind = Schema.Literals(
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
)
export type LitigationWorkflowKind = typeof LitigationWorkflowKind.Type

export const LegalSheetKind = Schema.Literals(
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
)
export type LegalSheetKind = typeof LegalSheetKind.Type

export const RoadmapMilestoneStatus = Schema.Literals("planned", "in_progress", "available", "deferred")
export type RoadmapMilestoneStatus = typeof RoadmapMilestoneStatus.Type

export const TrustLayerPolicy = Schema.Struct({
  sourceSpansRequired: Schema.Boolean,
  citationValidationRequired: Schema.Boolean,
  quoteVerificationRequired: Schema.Boolean,
  factualClaimVerificationRequired: Schema.Boolean,
  unresolvedQuestionsRequired: Schema.Boolean,
  verifyBeforeFilingStatusRequired: Schema.Boolean,
  fakeCitationDetectionRequired: Schema.Boolean,
  confidenceRequired: Schema.Boolean,
  humanApprovalRequiredForFinal: Schema.Boolean,
  acceptanceCriteria: Schema.Array(Schema.String),
})
export type TrustLayerPolicy = typeof TrustLayerPolicy.Type

export const DocumentEngineProfile = Schema.Struct({
  foundation: Schema.Literal("prosemirror"),
  collaboration: Schema.Literal("yjs"),
  v1Features: Schema.Array(Schema.String),
  laterFeatures: Schema.Array(Schema.String),
  exportTargets: Schema.Array(Schema.Literals("docx", "pdf")),
})
export type DocumentEngineProfile = typeof DocumentEngineProfile.Type

export const SheetEngineProfile = Schema.Struct({
  foundation: Schema.Literal("typed_legal_tables"),
  collaboration: Schema.Literal("yjs"),
  sheetKinds: Schema.Array(LegalSheetKind),
  v1Features: Schema.Array(Schema.String),
  nonGoals: Schema.Array(Schema.String),
})
export type SheetEngineProfile = typeof SheetEngineProfile.Type

export const AgentBrokerPolicy = Schema.Struct({
  requiresMatterScope: Schema.Boolean,
  requiresDeclaredReads: Schema.Boolean,
  requiresDeclaredOutputs: Schema.Boolean,
  allowedOutputKinds: Schema.Array(AgentOutputKind),
  finalOutputRequiresHumanApproval: Schema.Boolean,
  auditEveryReadWrite: Schema.Boolean,
  unauthorizedContextAccess: Schema.Literal("deny"),
})
export type AgentBrokerPolicy = typeof AgentBrokerPolicy.Type

export const CollaborationPolicy = Schema.Struct({
  localFirst: Schema.Boolean,
  publicLinksAllowed: Schema.Boolean,
  inviteRequired: Schema.Boolean,
  encryptedCloudSync: Schema.Boolean,
  durableRecords: Schema.Array(Schema.String),
  realtimeSignals: Schema.Array(Schema.String),
  authority: Schema.Array(Schema.String),
})
export type CollaborationPolicy = typeof CollaborationPolicy.Type

export const ProductRoadmapMilestone = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  status: RoadmapMilestoneStatus,
  summary: Schema.String,
  dependsOn: Schema.Array(Schema.String),
  acceptanceCriteria: Schema.Array(Schema.String),
})
export type ProductRoadmapMilestone = typeof ProductRoadmapMilestone.Type

export const ProductReliabilityRoadmap = Schema.Struct({
  primaryLaunchUser: Schema.Literal("us_solo_litigator"),
  primaryJurisdiction: Schema.Literal("us"),
  nextJurisdictions: Schema.Array(Jurisdiction),
  posture: Schema.Literal("human_in_the_loop_supervised_automation"),
  deployment: Schema.Literal("local_first_desktop_encrypted_cloud_sync"),
  firstWedge: Schema.Literal("multi_role_litigation_coworker"),
  matterCommandCenter: Schema.Array(Schema.String),
  legalCoworkers: Schema.Array(AgentRole),
  litigationWorkflows: Schema.Array(LitigationWorkflowKind),
  trustLayer: TrustLayerPolicy,
  documentEngine: DocumentEngineProfile,
  sheetEngine: SheetEngineProfile,
  agentBroker: AgentBrokerPolicy,
  collaboration: CollaborationPolicy,
  milestones: Schema.Array(ProductRoadmapMilestone),
})
export type ProductReliabilityRoadmap = typeof ProductReliabilityRoadmap.Type

export const WorkspaceProvider = Schema.Literals("google_workspace", "microsoft_365")
export type WorkspaceProvider = typeof WorkspaceProvider.Type

export const WorkspaceApp = Schema.Literals(
  "google_drive",
  "google_docs",
  "google_sheets",
  "one_drive",
  "sharepoint",
  "word",
  "excel",
)
export type WorkspaceApp = typeof WorkspaceApp.Type

export const WorkspaceOperationKind = Schema.Literals(
  "read",
  "write",
  "edit",
  "comment",
  "suggest",
  "import",
  "export",
  "sync",
)
export type WorkspaceOperationKind = typeof WorkspaceOperationKind.Type

export const WorkspaceConnectionStatus = Schema.Literals(
  "not_configured",
  "needs_auth",
  "connected",
  "paused",
  "revoked",
  "error",
)
export type WorkspaceConnectionStatus = typeof WorkspaceConnectionStatus.Type

export const WorkspaceSyncStatus = Schema.Literals("not_synced", "imported", "exported", "linked", "conflict", "error")
export type WorkspaceSyncStatus = typeof WorkspaceSyncStatus.Type

export const WorkspaceSyncDirection = Schema.Literals(
  "import_only",
  "export_only",
  "two_way",
  "legalcode_authoritative",
  "workspace_authoritative",
)
export type WorkspaceSyncDirection = typeof WorkspaceSyncDirection.Type

export const WorkspaceConflictStatus = Schema.Literals("clean", "conflict", "unknown")
export type WorkspaceConflictStatus = typeof WorkspaceConflictStatus.Type

export const SourceSpan = Schema.Struct({
  sourceID: SourceID,
  label: Schema.String.pipe(Schema.optional),
  page: Schema.Number.pipe(Schema.optional),
  section: Schema.String.pipe(Schema.optional),
  start: Schema.Number.pipe(Schema.optional),
  end: Schema.Number.pipe(Schema.optional),
  quote: Schema.String.pipe(Schema.optional),
})
export type SourceSpan = typeof SourceSpan.Type

export const Matter = Schema.Struct({
  id: MatterID,
  organizationID: OrganizationID.pipe(Schema.optional),
  name: Schema.String,
  type: MatterType,
  status: MatterStatus,
  jurisdiction: Jurisdiction,
  court: Schema.String.pipe(Schema.optional),
  docketNumber: Schema.String.pipe(Schema.optional),
  clientName: Schema.String.pipe(Schema.optional),
  opposingParties: Schema.Array(Schema.String),
  claims: Schema.Array(Schema.String),
  posture: Schema.String.pipe(Schema.optional),
  retentionPolicy: Schema.String.pipe(Schema.optional),
  securityClassification: Schema.Literals("standard", "confidential", "highly_confidential"),
  syncEnabled: Schema.Boolean,
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type Matter = typeof Matter.Type

export const Artifact = Schema.Struct({
  id: ArtifactID,
  matterID: MatterID,
  type: ArtifactType,
  status: ArtifactStatus,
  title: Schema.String,
  description: Schema.String.pipe(Schema.optional),
  path: Schema.String.pipe(Schema.optional),
  mimeType: Schema.String.pipe(Schema.optional),
  sourceIDs: Schema.Array(SourceID),
  verificationStatus: VerificationStatus,
  humanApproval: HumanApprovalStatus,
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type Artifact = typeof Artifact.Type

export const Source = Schema.Struct({
  id: SourceID,
  matterID: MatterID,
  artifactID: ArtifactID.pipe(Schema.optional),
  title: Schema.String,
  type: Schema.Literals("case", "statute", "rule", "regulation", "court_filing", "contract", "evidence", "note", "other"),
  locator: Schema.String.pipe(Schema.optional),
  jurisdiction: Jurisdiction.pipe(Schema.optional),
  hash: Schema.String.pipe(Schema.optional),
  extractedText: Schema.String.pipe(Schema.optional),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type Source = typeof Source.Type

export const Citation = Schema.Struct({
  id: CitationID,
  matterID: MatterID,
  artifactID: ArtifactID.pipe(Schema.optional),
  text: Schema.String,
  normalized: Schema.String.pipe(Schema.optional),
  sourceSpans: Schema.Array(SourceSpan),
  verificationStatus: VerificationStatus,
  confidence: Confidence,
  unresolvedQuestions: Schema.Array(Schema.String),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type Citation = typeof Citation.Type

export const Deadline = Schema.Struct({
  id: DeadlineID,
  matterID: MatterID,
  title: Schema.String,
  date: Schema.String,
  timezone: Schema.String,
  sourceSpans: Schema.Array(SourceSpan),
  status: Schema.Literals("proposed", "verified", "completed", "missed", "cancelled"),
  humanApproval: HumanApprovalStatus,
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type Deadline = typeof Deadline.Type

export const Task = Schema.Struct({
  id: TaskID,
  matterID: MatterID,
  title: Schema.String,
  description: Schema.String.pipe(Schema.optional),
  owner: Schema.String.pipe(Schema.optional),
  status: Schema.Literals("todo", "doing", "blocked", "done", "cancelled"),
  priority: Schema.Literals("low", "medium", "high", "urgent"),
  dueDate: Schema.String.pipe(Schema.optional),
  artifactIDs: Schema.Array(ArtifactID),
  sourceSpans: Schema.Array(SourceSpan),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type Task = typeof Task.Type

export const AuditEvent = Schema.Struct({
  id: AuditEventID,
  matterID: MatterID,
  actor: Schema.String,
  action: Schema.String,
  targetType: Schema.String,
  targetID: Schema.String,
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type AuditEvent = typeof AuditEvent.Type

export const AgentAction = Schema.Struct({
  id: AgentActionID,
  matterID: MatterID,
  role: AgentRole,
  outputKind: AgentOutputKind,
  promptSummary: Schema.String,
  contextArtifactIDs: Schema.Array(ArtifactID),
  contextSourceIDs: Schema.Array(SourceID),
  outputArtifactID: ArtifactID.pipe(Schema.optional),
  verificationStatus: VerificationStatus,
  humanApproval: HumanApprovalStatus,
  confidence: Confidence,
  unresolvedQuestions: Schema.Array(Schema.String),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type AgentAction = typeof AgentAction.Type

export const JurisdictionPack = Schema.Struct({
  jurisdiction: Jurisdiction,
  name: Schema.String,
  status: Schema.Literals("active", "planned"),
  citationFormats: Schema.Array(Schema.String),
  pleadingTemplates: Schema.Array(Schema.String),
  deadlineRules: Schema.Array(Schema.String),
  filingChecklist: Schema.Array(Schema.String),
  researchSourcePreferences: Schema.Array(Schema.String),
})
export type JurisdictionPack = typeof JurisdictionPack.Type

export const WorkspaceScope = Schema.Struct({
  provider: WorkspaceProvider,
  scope: Schema.String,
  purpose: Schema.String,
  requiredFor: Schema.Array(WorkspaceOperationKind),
  sensitive: Schema.Boolean,
  adminConsentLikely: Schema.Boolean,
})
export type WorkspaceScope = typeof WorkspaceScope.Type

export const WorkspaceIntegrationProfile = Schema.Struct({
  provider: WorkspaceProvider,
  label: Schema.String,
  status: Schema.Literals("planned", "available"),
  apps: Schema.Array(WorkspaceApp),
  authType: Schema.Literals("oauth_device_or_browser", "admin_consent_oauth"),
  readOperations: Schema.Array(WorkspaceOperationKind),
  writeOperations: Schema.Array(WorkspaceOperationKind),
  editOperations: Schema.Array(WorkspaceOperationKind),
  defaultScopes: Schema.Array(WorkspaceScope),
  riskControls: Schema.Array(Schema.String),
})
export type WorkspaceIntegrationProfile = typeof WorkspaceIntegrationProfile.Type

export const WorkspaceConnection = Schema.Struct({
  id: WorkspaceConnectionID,
  matterID: MatterID.pipe(Schema.optional),
  provider: WorkspaceProvider,
  accountEmail: Schema.String.pipe(Schema.optional),
  accountLabel: Schema.String.pipe(Schema.optional),
  tenantID: Schema.String.pipe(Schema.optional),
  domain: Schema.String.pipe(Schema.optional),
  status: WorkspaceConnectionStatus,
  scopes: Schema.Array(Schema.String),
  readEnabled: Schema.Boolean,
  writeEnabled: Schema.Boolean,
  editEnabled: Schema.Boolean,
  tokenVaultRef: WorkspaceTokenVaultRef.pipe(Schema.optional),
  lastSyncAt: Schema.String.pipe(Schema.optional),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type WorkspaceConnection = typeof WorkspaceConnection.Type

export const ExternalArtifact = Schema.Struct({
  id: ExternalArtifactID,
  matterID: MatterID,
  connectionID: WorkspaceConnectionID,
  provider: WorkspaceProvider,
  app: WorkspaceApp,
  externalID: Schema.String,
  title: Schema.String,
  mimeType: Schema.String.pipe(Schema.optional),
  webURL: Schema.String.pipe(Schema.optional),
  localArtifactID: ArtifactID.pipe(Schema.optional),
  sourceID: SourceID.pipe(Schema.optional),
  syncDirection: WorkspaceSyncDirection,
  syncStatus: WorkspaceSyncStatus,
  etag: Schema.String.pipe(Schema.optional),
  revision: Schema.String.pipe(Schema.optional),
  lastReadAt: Schema.String.pipe(Schema.optional),
  lastWriteAt: Schema.String.pipe(Schema.optional),
  humanApproval: HumanApprovalStatus,
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type ExternalArtifact = typeof ExternalArtifact.Type

export const WorkspaceOperation = Schema.Struct({
  id: WorkspaceOperationID,
  matterID: MatterID,
  connectionID: WorkspaceConnectionID,
  externalArtifactID: ExternalArtifactID.pipe(Schema.optional),
  provider: WorkspaceProvider,
  app: WorkspaceApp,
  operation: WorkspaceOperationKind,
  actor: Schema.String,
  status: Schema.Literals("planned", "approved", "running", "succeeded", "failed", "cancelled"),
  approval: HumanApprovalStatus,
  inputSummary: Schema.String,
  outputSummary: Schema.String.pipe(Schema.optional),
  sourceSpans: Schema.Array(SourceSpan),
  auditEventID: AuditEventID.pipe(Schema.optional),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type WorkspaceOperation = typeof WorkspaceOperation.Type

export const WorkspaceOperationPlan = Schema.Struct({
  provider: WorkspaceProvider,
  app: WorkspaceApp,
  operation: WorkspaceOperationKind,
  method: Schema.String,
  endpointTemplate: Schema.String,
  requiredScopes: Schema.Array(Schema.String),
  approvalRequired: Schema.Boolean,
  auditEventRequired: Schema.Boolean,
  sourceSpanRequired: Schema.Boolean,
  description: Schema.String,
})
export type WorkspaceOperationPlan = typeof WorkspaceOperationPlan.Type

export const WorkspaceOAuthAuthorizeRequest = Schema.Struct({
  provider: WorkspaceProvider,
  clientID: Schema.String,
  redirectURI: Schema.String,
  scopes: Schema.Array(Schema.String).pipe(Schema.optional),
  state: Schema.String,
  codeChallenge: Schema.String.pipe(Schema.optional),
  tenantID: Schema.String.pipe(Schema.optional),
  prompt: Schema.String.pipe(Schema.optional),
})
export type WorkspaceOAuthAuthorizeRequest = typeof WorkspaceOAuthAuthorizeRequest.Type

export const WorkspaceOAuthAuthorizeResponse = Schema.Struct({
  provider: WorkspaceProvider,
  authorizationURL: Schema.String,
  scopes: Schema.Array(Schema.String),
})
export type WorkspaceOAuthAuthorizeResponse = typeof WorkspaceOAuthAuthorizeResponse.Type

export const WorkspaceConnectStartRequest = Schema.Struct({
  provider: WorkspaceProvider,
  clientID: Schema.String,
  redirectURI: Schema.String,
  matterID: MatterID.pipe(Schema.optional),
  scopes: Schema.Array(Schema.String).pipe(Schema.optional),
  tenantID: Schema.String.pipe(Schema.optional),
  prompt: Schema.String.pipe(Schema.optional),
})
export type WorkspaceConnectStartRequest = typeof WorkspaceConnectStartRequest.Type

export const WorkspaceConnectStartResponse = Schema.Struct({
  provider: WorkspaceProvider,
  authorizationURL: Schema.String,
  scopes: Schema.Array(Schema.String),
  state: Schema.String,
  codeVerifier: Schema.String,
  codeChallenge: Schema.String,
  redirectURI: Schema.String,
  matterID: MatterID.pipe(Schema.optional),
})
export type WorkspaceConnectStartResponse = typeof WorkspaceConnectStartResponse.Type

export const WorkspaceOAuthTokenRequest = Schema.Struct({
  provider: WorkspaceProvider,
  clientID: Schema.String,
  redirectURI: Schema.String,
  code: Schema.String,
  codeVerifier: Schema.String.pipe(Schema.optional),
  clientSecret: Schema.String.pipe(Schema.optional),
  tenantID: Schema.String.pipe(Schema.optional),
})
export type WorkspaceOAuthTokenRequest = typeof WorkspaceOAuthTokenRequest.Type

export const WorkspaceOAuthRefreshRequest = Schema.Struct({
  provider: WorkspaceProvider,
  clientID: Schema.String,
  refreshToken: Schema.String,
  clientSecret: Schema.String.pipe(Schema.optional),
  tenantID: Schema.String.pipe(Schema.optional),
  scopes: Schema.Array(Schema.String).pipe(Schema.optional),
})
export type WorkspaceOAuthRefreshRequest = typeof WorkspaceOAuthRefreshRequest.Type

export const WorkspaceOAuthTokenResponse = Schema.Struct({
  provider: WorkspaceProvider,
  tokenType: Schema.String,
  expiresIn: Schema.Number.pipe(Schema.optional),
  scope: Schema.String.pipe(Schema.optional),
  accessToken: Schema.String,
  refreshToken: Schema.String.pipe(Schema.optional),
  idToken: Schema.String.pipe(Schema.optional),
})
export type WorkspaceOAuthTokenResponse = typeof WorkspaceOAuthTokenResponse.Type

export const WorkspaceExecuteRequest = Schema.Struct({
  matterID: MatterID,
  connectionID: WorkspaceConnectionID,
  externalArtifactID: ExternalArtifactID.pipe(Schema.optional),
  provider: WorkspaceProvider,
  app: WorkspaceApp,
  operation: WorkspaceOperationKind,
  accessToken: Schema.String,
  resourceID: Schema.String,
  siteID: Schema.String.pipe(Schema.optional),
  workspacePath: Schema.String.pipe(Schema.optional),
  httpMethod: Schema.String.pipe(Schema.optional),
  actor: Schema.String,
  approval: HumanApprovalStatus,
  inputSummary: Schema.String,
  sourceSpans: Schema.Array(SourceSpan),
  auditEventID: AuditEventID.pipe(Schema.optional),
  expectedETag: Schema.String.pipe(Schema.optional),
  expectedRevision: Schema.String.pipe(Schema.optional),
  conflictStatus: WorkspaceConflictStatus.pipe(Schema.optional),
  conflictCheckOperationID: WorkspaceOperationID.pipe(Schema.optional),
  content: Schema.String.pipe(Schema.optional),
  contentType: Schema.String.pipe(Schema.optional),
  body: Schema.Unknown.pipe(Schema.optional),
  dryRun: Schema.Boolean.pipe(Schema.optional),
})
export type WorkspaceExecuteRequest = typeof WorkspaceExecuteRequest.Type

export const WorkspaceExecuteWithVaultRequest = Schema.Struct({
  matterID: MatterID,
  connectionID: WorkspaceConnectionID,
  externalArtifactID: ExternalArtifactID.pipe(Schema.optional),
  provider: WorkspaceProvider,
  app: WorkspaceApp,
  operation: WorkspaceOperationKind,
  tokenVaultRef: WorkspaceTokenVaultRef,
  resourceID: Schema.String,
  siteID: Schema.String.pipe(Schema.optional),
  workspacePath: Schema.String.pipe(Schema.optional),
  httpMethod: Schema.String.pipe(Schema.optional),
  actor: Schema.String,
  approval: HumanApprovalStatus,
  inputSummary: Schema.String,
  sourceSpans: Schema.Array(SourceSpan),
  auditEventID: AuditEventID.pipe(Schema.optional),
  expectedETag: Schema.String.pipe(Schema.optional),
  expectedRevision: Schema.String.pipe(Schema.optional),
  conflictStatus: WorkspaceConflictStatus.pipe(Schema.optional),
  conflictCheckOperationID: WorkspaceOperationID.pipe(Schema.optional),
  content: Schema.String.pipe(Schema.optional),
  contentType: Schema.String.pipe(Schema.optional),
  body: Schema.Unknown.pipe(Schema.optional),
  dryRun: Schema.Boolean.pipe(Schema.optional),
})
export type WorkspaceExecuteWithVaultRequest = typeof WorkspaceExecuteWithVaultRequest.Type

export const WorkspaceExecutePreparedRequest = Schema.Struct({
  method: Schema.String,
  url: Schema.String,
  headers: Schema.Record(Schema.String, Schema.String),
  bodyKind: Schema.Literals("none", "json", "text"),
})
export type WorkspaceExecutePreparedRequest = typeof WorkspaceExecutePreparedRequest.Type

export const WorkspaceExecuteResult = Schema.Struct({
  status: Schema.Number,
  ok: Schema.Boolean,
  etag: Schema.String.pipe(Schema.optional),
  revision: Schema.String.pipe(Schema.optional),
  contentType: Schema.String.pipe(Schema.optional),
  json: Schema.Unknown.pipe(Schema.optional),
  text: Schema.String.pipe(Schema.optional),
})
export type WorkspaceExecuteResult = typeof WorkspaceExecuteResult.Type

export const WorkspaceExecuteResponse = Schema.Struct({
  operation: WorkspaceOperation,
  request: WorkspaceExecutePreparedRequest,
  result: WorkspaceExecuteResult.pipe(Schema.optional),
  blockedReasons: Schema.Array(Schema.String),
})
export type WorkspaceExecuteResponse = typeof WorkspaceExecuteResponse.Type

export const WorkspaceArtifactImportRequest = Schema.Struct({
  matterID: MatterID,
  connectionID: WorkspaceConnectionID,
  externalArtifactID: ExternalArtifactID.pipe(Schema.optional),
  provider: WorkspaceProvider,
  app: WorkspaceApp,
  tokenVaultRef: WorkspaceTokenVaultRef,
  externalID: Schema.String,
  siteID: Schema.String.pipe(Schema.optional),
  actor: Schema.String,
  syncDirection: WorkspaceSyncDirection.pipe(Schema.optional),
  humanApproval: HumanApprovalStatus.pipe(Schema.optional),
  metadata: Schema.Record(Schema.String, Schema.Unknown).pipe(Schema.optional),
  dryRun: Schema.Boolean.pipe(Schema.optional),
})
export type WorkspaceArtifactImportRequest = typeof WorkspaceArtifactImportRequest.Type

export const WorkspaceArtifactImportResponse = Schema.Struct({
  artifact: ExternalArtifact.pipe(Schema.optional),
  operation: WorkspaceOperation,
  request: WorkspaceExecutePreparedRequest,
  result: WorkspaceExecuteResult.pipe(Schema.optional),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
  blockedReasons: Schema.Array(Schema.String),
})
export type WorkspaceArtifactImportResponse = typeof WorkspaceArtifactImportResponse.Type

export const WorkspaceConflictCheckRequest = Schema.Struct({
  matterID: MatterID,
  externalArtifactID: ExternalArtifactID,
  tokenVaultRef: WorkspaceTokenVaultRef,
  actor: Schema.String,
  dryRun: Schema.Boolean.pipe(Schema.optional),
})
export type WorkspaceConflictCheckRequest = typeof WorkspaceConflictCheckRequest.Type

export const WorkspaceConflictCheckResponse = Schema.Struct({
  artifact: ExternalArtifact,
  operation: WorkspaceOperation,
  request: WorkspaceExecutePreparedRequest,
  result: WorkspaceExecuteResult.pipe(Schema.optional),
  status: WorkspaceConflictStatus,
  storedETag: Schema.String.pipe(Schema.optional),
  storedRevision: Schema.String.pipe(Schema.optional),
  currentETag: Schema.String.pipe(Schema.optional),
  currentRevision: Schema.String.pipe(Schema.optional),
  conflictReasons: Schema.Array(Schema.String),
  blockedReasons: Schema.Array(Schema.String),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type WorkspaceConflictCheckResponse = typeof WorkspaceConflictCheckResponse.Type

export const WorkspaceConnectionCreate = Schema.Struct({
  matterID: MatterID.pipe(Schema.optional),
  provider: WorkspaceProvider,
  accountEmail: Schema.String.pipe(Schema.optional),
  accountLabel: Schema.String.pipe(Schema.optional),
  tenantID: Schema.String.pipe(Schema.optional),
  domain: Schema.String.pipe(Schema.optional),
  status: WorkspaceConnectionStatus,
  scopes: Schema.Array(Schema.String),
  readEnabled: Schema.Boolean,
  writeEnabled: Schema.Boolean,
  editEnabled: Schema.Boolean,
  tokenVaultRef: WorkspaceTokenVaultRef.pipe(Schema.optional),
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type WorkspaceConnectionCreate = typeof WorkspaceConnectionCreate.Type

export const WorkspaceConnectFinalizeRequest = Schema.Struct({
  provider: WorkspaceProvider,
  clientID: Schema.String,
  redirectURI: Schema.String,
  code: Schema.String,
  codeVerifier: Schema.String,
  matterID: MatterID.pipe(Schema.optional),
  accountEmail: Schema.String.pipe(Schema.optional),
  accountLabel: Schema.String.pipe(Schema.optional),
  tenantID: Schema.String.pipe(Schema.optional),
  domain: Schema.String.pipe(Schema.optional),
  clientSecret: Schema.String.pipe(Schema.optional),
})
export type WorkspaceConnectFinalizeRequest = typeof WorkspaceConnectFinalizeRequest.Type

export const WorkspaceConnectFinalizeResponse = Schema.Struct({
  provider: WorkspaceProvider,
  token: WorkspaceTokenVaultInfo,
  connection: WorkspaceConnection,
})
export type WorkspaceConnectFinalizeResponse = typeof WorkspaceConnectFinalizeResponse.Type

export const ExternalArtifactLink = Schema.Struct({
  matterID: MatterID,
  connectionID: WorkspaceConnectionID,
  provider: WorkspaceProvider,
  app: WorkspaceApp,
  externalID: Schema.String,
  title: Schema.String,
  mimeType: Schema.String.pipe(Schema.optional),
  webURL: Schema.String.pipe(Schema.optional),
  localArtifactID: ArtifactID.pipe(Schema.optional),
  sourceID: SourceID.pipe(Schema.optional),
  syncDirection: WorkspaceSyncDirection,
  syncStatus: WorkspaceSyncStatus,
  etag: Schema.String.pipe(Schema.optional),
  revision: Schema.String.pipe(Schema.optional),
  humanApproval: HumanApprovalStatus,
  metadata: Schema.Record(Schema.String, Schema.Unknown),
})
export type ExternalArtifactLink = typeof ExternalArtifactLink.Type

export const WorkspaceRecordOperation = Schema.Struct({
  operation: WorkspaceOperation,
  result: WorkspaceExecuteResult.pipe(Schema.optional),
})
export type WorkspaceRecordOperation = typeof WorkspaceRecordOperation.Type

export const WorkspaceTokenVaultStore = Schema.Struct({
  provider: WorkspaceProvider,
  accountEmail: Schema.String.pipe(Schema.optional),
  accountLabel: Schema.String.pipe(Schema.optional),
  tenantID: Schema.String.pipe(Schema.optional),
  clientID: Schema.String.pipe(Schema.optional),
  clientSecret: Schema.String.pipe(Schema.optional),
  scopes: Schema.Array(Schema.String),
  tokenType: Schema.String,
  expiresIn: Schema.Number.pipe(Schema.optional),
  accessToken: Schema.String,
  refreshToken: Schema.String.pipe(Schema.optional),
  idToken: Schema.String.pipe(Schema.optional),
})
export type WorkspaceTokenVaultStore = typeof WorkspaceTokenVaultStore.Type

export const WorkspaceTokenVaultInfo = Schema.Struct({
  ref: WorkspaceTokenVaultRef,
  provider: WorkspaceProvider,
  accountEmail: Schema.String.pipe(Schema.optional),
  accountLabel: Schema.String.pipe(Schema.optional),
  tenantID: Schema.String.pipe(Schema.optional),
  scopes: Schema.Array(Schema.String),
  tokenType: Schema.String,
  expiresAt: Schema.String.pipe(Schema.optional),
  timeCreated: Schema.String,
  timeUpdated: Schema.String,
})
export type WorkspaceTokenVaultInfo = typeof WorkspaceTokenVaultInfo.Type
