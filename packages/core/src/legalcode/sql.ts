import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../database/schema.sql"
import type { LegalCode } from "../legalcode"

export const LegalMatterTable = sqliteTable(
  "legal_matter",
  {
    id: text().$type<LegalCode.MatterID>().primaryKey(),
    organization_id: text().$type<LegalCode.OrganizationID>(),
    name: text().notNull(),
    type: text().$type<LegalCode.MatterType>().notNull(),
    status: text().$type<LegalCode.MatterStatus>().notNull(),
    jurisdiction: text().$type<LegalCode.Jurisdiction>().notNull(),
    court: text(),
    docket_number: text(),
    client_name: text(),
    opposing_parties: text({ mode: "json" }).notNull().$type<string[]>(),
    claims: text({ mode: "json" }).notNull().$type<string[]>(),
    posture: text(),
    retention_policy: text(),
    security_classification: text().$type<LegalCode.Matter["securityClassification"]>().notNull(),
    sync_enabled: integer({ mode: "boolean" }).notNull().default(false),
    metadata: text({ mode: "json" }).notNull().$type<Record<string, unknown>>(),
    ...Timestamps,
    time_archived: integer(),
  },
  (table) => [
    index("legal_matter_jurisdiction_status_idx").on(table.jurisdiction, table.status),
    index("legal_matter_client_name_idx").on(table.client_name),
  ],
)

export const LegalArtifactTable = sqliteTable(
  "legal_artifact",
  {
    id: text().$type<LegalCode.ArtifactID>().primaryKey(),
    matter_id: text()
      .$type<LegalCode.MatterID>()
      .notNull()
      .references(() => LegalMatterTable.id, { onDelete: "cascade" }),
    type: text().$type<LegalCode.ArtifactType>().notNull(),
    status: text().$type<LegalCode.ArtifactStatus>().notNull(),
    title: text().notNull(),
    description: text(),
    path: text(),
    mime_type: text(),
    source_ids: text({ mode: "json" }).notNull().$type<LegalCode.SourceID[]>(),
    verification_status: text().$type<LegalCode.VerificationStatus>().notNull(),
    human_approval: text().$type<LegalCode.HumanApprovalStatus>().notNull(),
    metadata: text({ mode: "json" }).notNull().$type<Record<string, unknown>>(),
    ...Timestamps,
  },
  (table) => [
    index("legal_artifact_matter_type_idx").on(table.matter_id, table.type),
    index("legal_artifact_matter_status_idx").on(table.matter_id, table.status),
  ],
)

export const LegalSourceTable = sqliteTable(
  "legal_source",
  {
    id: text().$type<LegalCode.SourceID>().primaryKey(),
    matter_id: text()
      .$type<LegalCode.MatterID>()
      .notNull()
      .references(() => LegalMatterTable.id, { onDelete: "cascade" }),
    artifact_id: text()
      .$type<LegalCode.ArtifactID>()
      .references(() => LegalArtifactTable.id, { onDelete: "set null" }),
    title: text().notNull(),
    type: text().$type<LegalCode.Source["type"]>().notNull(),
    locator: text(),
    jurisdiction: text().$type<LegalCode.Jurisdiction>(),
    hash: text(),
    extracted_text: text(),
    metadata: text({ mode: "json" }).notNull().$type<Record<string, unknown>>(),
    ...Timestamps,
  },
  (table) => [
    index("legal_source_matter_type_idx").on(table.matter_id, table.type),
    index("legal_source_hash_idx").on(table.hash),
  ],
)

export const LegalCitationTable = sqliteTable(
  "legal_citation",
  {
    id: text().$type<LegalCode.CitationID>().primaryKey(),
    matter_id: text()
      .$type<LegalCode.MatterID>()
      .notNull()
      .references(() => LegalMatterTable.id, { onDelete: "cascade" }),
    artifact_id: text()
      .$type<LegalCode.ArtifactID>()
      .references(() => LegalArtifactTable.id, { onDelete: "set null" }),
    text: text().notNull(),
    normalized: text(),
    source_spans: text({ mode: "json" }).notNull().$type<LegalCode.SourceSpan[]>(),
    verification_status: text().$type<LegalCode.VerificationStatus>().notNull(),
    confidence: text().$type<LegalCode.Confidence>().notNull(),
    unresolved_questions: text({ mode: "json" }).notNull().$type<string[]>(),
    metadata: text({ mode: "json" }).notNull().$type<Record<string, unknown>>(),
    ...Timestamps,
  },
  (table) => [
    index("legal_citation_matter_status_idx").on(table.matter_id, table.verification_status),
    index("legal_citation_artifact_idx").on(table.artifact_id),
  ],
)

export const LegalDeadlineTable = sqliteTable(
  "legal_deadline",
  {
    id: text().$type<LegalCode.DeadlineID>().primaryKey(),
    matter_id: text()
      .$type<LegalCode.MatterID>()
      .notNull()
      .references(() => LegalMatterTable.id, { onDelete: "cascade" }),
    title: text().notNull(),
    date: text().notNull(),
    timezone: text().notNull(),
    source_spans: text({ mode: "json" }).notNull().$type<LegalCode.SourceSpan[]>(),
    status: text().$type<LegalCode.Deadline["status"]>().notNull(),
    human_approval: text().$type<LegalCode.HumanApprovalStatus>().notNull(),
    metadata: text({ mode: "json" }).notNull().$type<Record<string, unknown>>(),
    ...Timestamps,
  },
  (table) => [
    index("legal_deadline_matter_date_idx").on(table.matter_id, table.date),
    index("legal_deadline_matter_status_idx").on(table.matter_id, table.status),
  ],
)

export const LegalTaskTable = sqliteTable(
  "legal_task",
  {
    id: text().$type<LegalCode.TaskID>().primaryKey(),
    matter_id: text()
      .$type<LegalCode.MatterID>()
      .notNull()
      .references(() => LegalMatterTable.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text(),
    owner: text(),
    status: text().$type<LegalCode.Task["status"]>().notNull(),
    priority: text().$type<LegalCode.Task["priority"]>().notNull(),
    due_date: text(),
    artifact_ids: text({ mode: "json" }).notNull().$type<LegalCode.ArtifactID[]>(),
    source_spans: text({ mode: "json" }).notNull().$type<LegalCode.SourceSpan[]>(),
    metadata: text({ mode: "json" }).notNull().$type<Record<string, unknown>>(),
    ...Timestamps,
  },
  (table) => [
    index("legal_task_matter_status_idx").on(table.matter_id, table.status),
    index("legal_task_matter_due_idx").on(table.matter_id, table.due_date),
  ],
)

export const LegalAuditEventTable = sqliteTable(
  "legal_audit_event",
  {
    id: text().$type<LegalCode.AuditEventID>().primaryKey(),
    matter_id: text()
      .$type<LegalCode.MatterID>()
      .notNull()
      .references(() => LegalMatterTable.id, { onDelete: "cascade" }),
    actor: text().notNull(),
    action: text().notNull(),
    target_type: text().notNull(),
    target_id: text().notNull(),
    metadata: text({ mode: "json" }).notNull().$type<Record<string, unknown>>(),
    time_created: integer()
      .notNull()
      .$default(() => Date.now()),
  },
  (table) => [
    index("legal_audit_event_matter_time_idx").on(table.matter_id, table.time_created),
    index("legal_audit_event_target_idx").on(table.target_type, table.target_id),
  ],
)

export const LegalAgentActionTable = sqliteTable(
  "legal_agent_action",
  {
    id: text().$type<LegalCode.AgentActionID>().primaryKey(),
    matter_id: text()
      .$type<LegalCode.MatterID>()
      .notNull()
      .references(() => LegalMatterTable.id, { onDelete: "cascade" }),
    role: text().$type<LegalCode.AgentRole>().notNull(),
    output_kind: text().$type<LegalCode.AgentOutputKind>().notNull(),
    prompt_summary: text().notNull(),
    context_artifact_ids: text({ mode: "json" }).notNull().$type<LegalCode.ArtifactID[]>(),
    context_source_ids: text({ mode: "json" }).notNull().$type<LegalCode.SourceID[]>(),
    output_artifact_id: text()
      .$type<LegalCode.ArtifactID>()
      .references(() => LegalArtifactTable.id, { onDelete: "set null" }),
    verification_status: text().$type<LegalCode.VerificationStatus>().notNull(),
    human_approval: text().$type<LegalCode.HumanApprovalStatus>().notNull(),
    confidence: text().$type<LegalCode.Confidence>().notNull(),
    unresolved_questions: text({ mode: "json" }).notNull().$type<string[]>(),
    metadata: text({ mode: "json" }).notNull().$type<Record<string, unknown>>(),
    ...Timestamps,
  },
  (table) => [
    index("legal_agent_action_matter_role_idx").on(table.matter_id, table.role),
    index("legal_agent_action_matter_output_idx").on(table.matter_id, table.output_kind),
  ],
)
