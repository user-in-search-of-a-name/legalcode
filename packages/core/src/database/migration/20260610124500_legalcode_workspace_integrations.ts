import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20260610124500_legalcode_workspace_integrations",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`
        CREATE TABLE IF NOT EXISTS \`legal_workspace_connection\` (
          \`id\` text PRIMARY KEY,
          \`matter_id\` text,
          \`provider\` text NOT NULL,
          \`account_email\` text,
          \`account_label\` text,
          \`tenant_id\` text,
          \`domain\` text,
          \`status\` text NOT NULL,
          \`scopes\` text NOT NULL,
          \`read_enabled\` integer DEFAULT 0 NOT NULL,
          \`write_enabled\` integer DEFAULT 0 NOT NULL,
          \`edit_enabled\` integer DEFAULT 0 NOT NULL,
          \`token_vault_ref\` text,
          \`last_sync_at\` text,
          \`metadata\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`fk_legal_workspace_connection_matter_id\` FOREIGN KEY (\`matter_id\`) REFERENCES \`legal_matter\`(\`id\`) ON DELETE CASCADE
        );
      `)
      yield* tx.run(
        `CREATE INDEX IF NOT EXISTS \`legal_workspace_connection_matter_provider_idx\` ON \`legal_workspace_connection\` (\`matter_id\`,\`provider\`);`,
      )
      yield* tx.run(
        `CREATE INDEX IF NOT EXISTS \`legal_workspace_connection_status_idx\` ON \`legal_workspace_connection\` (\`status\`);`,
      )

      yield* tx.run(`
        CREATE TABLE IF NOT EXISTS \`legal_external_artifact\` (
          \`id\` text PRIMARY KEY,
          \`matter_id\` text NOT NULL,
          \`connection_id\` text NOT NULL,
          \`provider\` text NOT NULL,
          \`app\` text NOT NULL,
          \`external_id\` text NOT NULL,
          \`title\` text NOT NULL,
          \`mime_type\` text,
          \`web_url\` text,
          \`local_artifact_id\` text,
          \`source_id\` text,
          \`sync_direction\` text NOT NULL,
          \`sync_status\` text NOT NULL,
          \`etag\` text,
          \`revision\` text,
          \`last_read_at\` text,
          \`last_write_at\` text,
          \`human_approval\` text NOT NULL,
          \`metadata\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`fk_legal_external_artifact_matter_id\` FOREIGN KEY (\`matter_id\`) REFERENCES \`legal_matter\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_legal_external_artifact_connection_id\` FOREIGN KEY (\`connection_id\`) REFERENCES \`legal_workspace_connection\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_legal_external_artifact_local_artifact_id\` FOREIGN KEY (\`local_artifact_id\`) REFERENCES \`legal_artifact\`(\`id\`) ON DELETE SET NULL,
          CONSTRAINT \`fk_legal_external_artifact_source_id\` FOREIGN KEY (\`source_id\`) REFERENCES \`legal_source\`(\`id\`) ON DELETE SET NULL
        );
      `)
      yield* tx.run(
        `CREATE INDEX IF NOT EXISTS \`legal_external_artifact_matter_provider_idx\` ON \`legal_external_artifact\` (\`matter_id\`,\`provider\`);`,
      )
      yield* tx.run(
        `CREATE INDEX IF NOT EXISTS \`legal_external_artifact_connection_idx\` ON \`legal_external_artifact\` (\`connection_id\`);`,
      )
      yield* tx.run(
        `CREATE INDEX IF NOT EXISTS \`legal_external_artifact_external_idx\` ON \`legal_external_artifact\` (\`provider\`,\`external_id\`);`,
      )

      yield* tx.run(`
        CREATE TABLE IF NOT EXISTS \`legal_workspace_operation\` (
          \`id\` text PRIMARY KEY,
          \`matter_id\` text NOT NULL,
          \`connection_id\` text NOT NULL,
          \`external_artifact_id\` text,
          \`provider\` text NOT NULL,
          \`app\` text NOT NULL,
          \`operation\` text NOT NULL,
          \`actor\` text NOT NULL,
          \`status\` text NOT NULL,
          \`approval\` text NOT NULL,
          \`input_summary\` text NOT NULL,
          \`output_summary\` text,
          \`source_spans\` text NOT NULL,
          \`audit_event_id\` text,
          \`metadata\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`fk_legal_workspace_operation_matter_id\` FOREIGN KEY (\`matter_id\`) REFERENCES \`legal_matter\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_legal_workspace_operation_connection_id\` FOREIGN KEY (\`connection_id\`) REFERENCES \`legal_workspace_connection\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_legal_workspace_operation_external_artifact_id\` FOREIGN KEY (\`external_artifact_id\`) REFERENCES \`legal_external_artifact\`(\`id\`) ON DELETE SET NULL,
          CONSTRAINT \`fk_legal_workspace_operation_audit_event_id\` FOREIGN KEY (\`audit_event_id\`) REFERENCES \`legal_audit_event\`(\`id\`) ON DELETE SET NULL
        );
      `)
      yield* tx.run(
        `CREATE INDEX IF NOT EXISTS \`legal_workspace_operation_matter_time_idx\` ON \`legal_workspace_operation\` (\`matter_id\`,\`time_created\`);`,
      )
      yield* tx.run(
        `CREATE INDEX IF NOT EXISTS \`legal_workspace_operation_provider_operation_idx\` ON \`legal_workspace_operation\` (\`provider\`,\`operation\`);`,
      )
      yield* tx.run(
        `CREATE INDEX IF NOT EXISTS \`legal_workspace_operation_status_idx\` ON \`legal_workspace_operation\` (\`status\`);`,
      )
    })
  },
} satisfies DatabaseMigration.Migration
