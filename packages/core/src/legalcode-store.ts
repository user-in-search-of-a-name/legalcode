export * as LegalCodeStore from "./legalcode-store"

import { and, desc, eq } from "drizzle-orm"
import { Context, Effect, Layer } from "effect"
import { Database } from "./database/database"
import { LegalCode } from "./legalcode"
import {
  LegalExternalArtifactTable,
  LegalWorkspaceConnectionTable,
  LegalWorkspaceOperationTable,
} from "./legalcode/sql"

export interface Interface {
  readonly createConnection: (
    input: LegalCode.WorkspaceConnectionCreate,
  ) => Effect.Effect<LegalCode.WorkspaceConnection>
  readonly listConnections: (input?: {
    matterID?: LegalCode.MatterID
    provider?: LegalCode.WorkspaceProvider
  }) => Effect.Effect<LegalCode.WorkspaceConnection[]>
  readonly linkExternalArtifact: (input: LegalCode.ExternalArtifactLink) => Effect.Effect<LegalCode.ExternalArtifact>
  readonly getExternalArtifact: (
    id: LegalCode.ExternalArtifactID,
  ) => Effect.Effect<LegalCode.ExternalArtifact | undefined>
  readonly listExternalArtifacts: (input: {
    matterID: LegalCode.MatterID
    provider?: LegalCode.WorkspaceProvider
  }) => Effect.Effect<LegalCode.ExternalArtifact[]>
  readonly recordOperation: (input: LegalCode.WorkspaceRecordOperation) => Effect.Effect<LegalCode.WorkspaceOperation>
  readonly listOperations: (input: {
    matterID: LegalCode.MatterID
    provider?: LegalCode.WorkspaceProvider
  }) => Effect.Effect<LegalCode.WorkspaceOperation[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/legalcode/WorkspaceStore") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const { db } = yield* Database.Service

    return Service.of({
      createConnection: Effect.fn("LegalCodeStore.createConnection")(function* (input) {
        const now = Date.now()
        const row = {
          id: LegalCode.WorkspaceConnectionID.create(),
          matter_id: input.matterID,
          provider: input.provider,
          account_email: input.accountEmail,
          account_label: input.accountLabel,
          tenant_id: input.tenantID,
          domain: input.domain,
          status: input.status,
          scopes: input.scopes,
          read_enabled: input.readEnabled,
          write_enabled: input.writeEnabled,
          edit_enabled: input.editEnabled,
          token_vault_ref: input.tokenVaultRef,
          last_sync_at: undefined,
          metadata: input.metadata,
          time_created: now,
          time_updated: now,
        }
        yield* db.insert(LegalWorkspaceConnectionTable).values(row).run().pipe(Effect.orDie)
        return {
          id: row.id,
          matterID: input.matterID,
          provider: input.provider,
          accountEmail: input.accountEmail,
          accountLabel: input.accountLabel,
          tenantID: input.tenantID,
          domain: input.domain,
          status: input.status,
          scopes: input.scopes,
          readEnabled: input.readEnabled,
          writeEnabled: input.writeEnabled,
          editEnabled: input.editEnabled,
          tokenVaultRef: input.tokenVaultRef,
          metadata: input.metadata,
        }
      }),

      listConnections: Effect.fn("LegalCodeStore.listConnections")(function* (input) {
        const where =
          input?.matterID && input.provider
            ? and(
                eq(LegalWorkspaceConnectionTable.matter_id, input.matterID),
                eq(LegalWorkspaceConnectionTable.provider, input.provider),
              )
            : input?.matterID
              ? eq(LegalWorkspaceConnectionTable.matter_id, input.matterID)
              : input?.provider
                ? eq(LegalWorkspaceConnectionTable.provider, input.provider)
                : undefined
        const rows = yield* db
          .select()
          .from(LegalWorkspaceConnectionTable)
          .where(where)
          .orderBy(desc(LegalWorkspaceConnectionTable.time_created))
          .all()
          .pipe(Effect.orDie)
        return rows.map(connectionFromRow)
      }),

      linkExternalArtifact: Effect.fn("LegalCodeStore.linkExternalArtifact")(function* (input) {
        const now = Date.now()
        const row = {
          id: LegalCode.ExternalArtifactID.create(),
          matter_id: input.matterID,
          connection_id: input.connectionID,
          provider: input.provider,
          app: input.app,
          external_id: input.externalID,
          title: input.title,
          mime_type: input.mimeType,
          web_url: input.webURL,
          local_artifact_id: input.localArtifactID,
          source_id: input.sourceID,
          sync_direction: input.syncDirection,
          sync_status: input.syncStatus,
          etag: input.etag,
          revision: input.revision,
          last_read_at: undefined,
          last_write_at: undefined,
          human_approval: input.humanApproval,
          metadata: input.metadata,
          time_created: now,
          time_updated: now,
        }
        yield* db.insert(LegalExternalArtifactTable).values(row).run().pipe(Effect.orDie)
        return {
          id: row.id,
          matterID: input.matterID,
          connectionID: input.connectionID,
          provider: input.provider,
          app: input.app,
          externalID: input.externalID,
          title: input.title,
          mimeType: input.mimeType,
          webURL: input.webURL,
          localArtifactID: input.localArtifactID,
          sourceID: input.sourceID,
          syncDirection: input.syncDirection,
          syncStatus: input.syncStatus,
          etag: input.etag,
          revision: input.revision,
          humanApproval: input.humanApproval,
          metadata: input.metadata,
        }
      }),

      getExternalArtifact: Effect.fn("LegalCodeStore.getExternalArtifact")(function* (id) {
        const row = yield* db
          .select()
          .from(LegalExternalArtifactTable)
          .where(eq(LegalExternalArtifactTable.id, id))
          .get()
          .pipe(Effect.orDie)
        return row ? externalArtifactFromRow(row) : undefined
      }),

      listExternalArtifacts: Effect.fn("LegalCodeStore.listExternalArtifacts")(function* (input) {
        const where = input.provider
          ? and(
              eq(LegalExternalArtifactTable.matter_id, input.matterID),
              eq(LegalExternalArtifactTable.provider, input.provider),
            )
          : eq(LegalExternalArtifactTable.matter_id, input.matterID)
        const rows = yield* db
          .select()
          .from(LegalExternalArtifactTable)
          .where(where)
          .orderBy(desc(LegalExternalArtifactTable.time_created))
          .all()
          .pipe(Effect.orDie)
        return rows.map(externalArtifactFromRow)
      }),

      recordOperation: Effect.fn("LegalCodeStore.recordOperation")(function* (input) {
        const now = Date.now()
        const operation = input.operation
        const row = {
          id: operation.id,
          matter_id: operation.matterID,
          connection_id: operation.connectionID,
          external_artifact_id: operation.externalArtifactID,
          provider: operation.provider,
          app: operation.app,
          operation: operation.operation,
          actor: operation.actor,
          status: operation.status,
          approval: operation.approval,
          input_summary: operation.inputSummary,
          output_summary: operation.outputSummary,
          source_spans: operation.sourceSpans,
          audit_event_id: operation.auditEventID,
          metadata: {
            ...operation.metadata,
            result: input.result,
          },
          time_created: now,
          time_updated: now,
        }
        yield* db.insert(LegalWorkspaceOperationTable).values(row).run().pipe(Effect.orDie)
        return operation
      }),

      listOperations: Effect.fn("LegalCodeStore.listOperations")(function* (input) {
        const where = input.provider
          ? and(
              eq(LegalWorkspaceOperationTable.matter_id, input.matterID),
              eq(LegalWorkspaceOperationTable.provider, input.provider),
            )
          : eq(LegalWorkspaceOperationTable.matter_id, input.matterID)
        const rows = yield* db
          .select()
          .from(LegalWorkspaceOperationTable)
          .where(where)
          .orderBy(desc(LegalWorkspaceOperationTable.time_created))
          .all()
          .pipe(Effect.orDie)
        return rows.map(operationFromRow)
      }),
    })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(Database.defaultLayer))

function connectionFromRow(row: typeof LegalWorkspaceConnectionTable.$inferSelect): LegalCode.WorkspaceConnection {
  return {
    id: row.id,
    matterID: row.matter_id ?? undefined,
    provider: row.provider,
    accountEmail: row.account_email ?? undefined,
    accountLabel: row.account_label ?? undefined,
    tenantID: row.tenant_id ?? undefined,
    domain: row.domain ?? undefined,
    status: row.status,
    scopes: row.scopes,
    readEnabled: row.read_enabled,
    writeEnabled: row.write_enabled,
    editEnabled: row.edit_enabled,
    tokenVaultRef: row.token_vault_ref ?? undefined,
    lastSyncAt: row.last_sync_at ?? undefined,
    metadata: row.metadata,
  }
}

function externalArtifactFromRow(row: typeof LegalExternalArtifactTable.$inferSelect): LegalCode.ExternalArtifact {
  return {
    id: row.id,
    matterID: row.matter_id,
    connectionID: row.connection_id,
    provider: row.provider,
    app: row.app,
    externalID: row.external_id,
    title: row.title,
    mimeType: row.mime_type ?? undefined,
    webURL: row.web_url ?? undefined,
    localArtifactID: row.local_artifact_id ?? undefined,
    sourceID: row.source_id ?? undefined,
    syncDirection: row.sync_direction,
    syncStatus: row.sync_status,
    etag: row.etag ?? undefined,
    revision: row.revision ?? undefined,
    lastReadAt: row.last_read_at ?? undefined,
    lastWriteAt: row.last_write_at ?? undefined,
    humanApproval: row.human_approval,
    metadata: row.metadata,
  }
}

function operationFromRow(row: typeof LegalWorkspaceOperationTable.$inferSelect): LegalCode.WorkspaceOperation {
  return {
    id: row.id,
    matterID: row.matter_id,
    connectionID: row.connection_id,
    externalArtifactID: row.external_artifact_id ?? undefined,
    provider: row.provider,
    app: row.app,
    operation: row.operation,
    actor: row.actor,
    status: row.status,
    approval: row.approval,
    inputSummary: row.input_summary,
    outputSummary: row.output_summary ?? undefined,
    sourceSpans: row.source_spans,
    auditEventID: row.audit_event_id ?? undefined,
    metadata: row.metadata,
  }
}
