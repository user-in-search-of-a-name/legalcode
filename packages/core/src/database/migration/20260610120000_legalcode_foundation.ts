import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20260610120000_legalcode_foundation",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`
        CREATE TABLE IF NOT EXISTS \`legal_matter\` (
          \`id\` text PRIMARY KEY,
          \`organization_id\` text,
          \`name\` text NOT NULL,
          \`type\` text NOT NULL,
          \`status\` text NOT NULL,
          \`jurisdiction\` text NOT NULL,
          \`court\` text,
          \`docket_number\` text,
          \`client_name\` text,
          \`opposing_parties\` text NOT NULL,
          \`claims\` text NOT NULL,
          \`posture\` text,
          \`retention_policy\` text,
          \`security_classification\` text NOT NULL,
          \`sync_enabled\` integer DEFAULT 0 NOT NULL,
          \`metadata\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          \`time_archived\` integer
        );
      `)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_matter_jurisdiction_status_idx\` ON \`legal_matter\` (\`jurisdiction\`,\`status\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_matter_client_name_idx\` ON \`legal_matter\` (\`client_name\`);`)

      yield* tx.run(`
        CREATE TABLE IF NOT EXISTS \`legal_artifact\` (
          \`id\` text PRIMARY KEY,
          \`matter_id\` text NOT NULL,
          \`type\` text NOT NULL,
          \`status\` text NOT NULL,
          \`title\` text NOT NULL,
          \`description\` text,
          \`path\` text,
          \`mime_type\` text,
          \`source_ids\` text NOT NULL,
          \`verification_status\` text NOT NULL,
          \`human_approval\` text NOT NULL,
          \`metadata\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`fk_legal_artifact_matter_id\` FOREIGN KEY (\`matter_id\`) REFERENCES \`legal_matter\`(\`id\`) ON DELETE CASCADE
        );
      `)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_artifact_matter_type_idx\` ON \`legal_artifact\` (\`matter_id\`,\`type\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_artifact_matter_status_idx\` ON \`legal_artifact\` (\`matter_id\`,\`status\`);`)

      yield* tx.run(`
        CREATE TABLE IF NOT EXISTS \`legal_source\` (
          \`id\` text PRIMARY KEY,
          \`matter_id\` text NOT NULL,
          \`artifact_id\` text,
          \`title\` text NOT NULL,
          \`type\` text NOT NULL,
          \`locator\` text,
          \`jurisdiction\` text,
          \`hash\` text,
          \`extracted_text\` text,
          \`metadata\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`fk_legal_source_matter_id\` FOREIGN KEY (\`matter_id\`) REFERENCES \`legal_matter\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_legal_source_artifact_id\` FOREIGN KEY (\`artifact_id\`) REFERENCES \`legal_artifact\`(\`id\`) ON DELETE SET NULL
        );
      `)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_source_matter_type_idx\` ON \`legal_source\` (\`matter_id\`,\`type\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_source_hash_idx\` ON \`legal_source\` (\`hash\`);`)

      yield* tx.run(`
        CREATE TABLE IF NOT EXISTS \`legal_citation\` (
          \`id\` text PRIMARY KEY,
          \`matter_id\` text NOT NULL,
          \`artifact_id\` text,
          \`text\` text NOT NULL,
          \`normalized\` text,
          \`source_spans\` text NOT NULL,
          \`verification_status\` text NOT NULL,
          \`confidence\` text NOT NULL,
          \`unresolved_questions\` text NOT NULL,
          \`metadata\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`fk_legal_citation_matter_id\` FOREIGN KEY (\`matter_id\`) REFERENCES \`legal_matter\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_legal_citation_artifact_id\` FOREIGN KEY (\`artifact_id\`) REFERENCES \`legal_artifact\`(\`id\`) ON DELETE SET NULL
        );
      `)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_citation_matter_status_idx\` ON \`legal_citation\` (\`matter_id\`,\`verification_status\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_citation_artifact_idx\` ON \`legal_citation\` (\`artifact_id\`);`)

      yield* tx.run(`
        CREATE TABLE IF NOT EXISTS \`legal_deadline\` (
          \`id\` text PRIMARY KEY,
          \`matter_id\` text NOT NULL,
          \`title\` text NOT NULL,
          \`date\` text NOT NULL,
          \`timezone\` text NOT NULL,
          \`source_spans\` text NOT NULL,
          \`status\` text NOT NULL,
          \`human_approval\` text NOT NULL,
          \`metadata\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`fk_legal_deadline_matter_id\` FOREIGN KEY (\`matter_id\`) REFERENCES \`legal_matter\`(\`id\`) ON DELETE CASCADE
        );
      `)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_deadline_matter_date_idx\` ON \`legal_deadline\` (\`matter_id\`,\`date\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_deadline_matter_status_idx\` ON \`legal_deadline\` (\`matter_id\`,\`status\`);`)

      yield* tx.run(`
        CREATE TABLE IF NOT EXISTS \`legal_task\` (
          \`id\` text PRIMARY KEY,
          \`matter_id\` text NOT NULL,
          \`title\` text NOT NULL,
          \`description\` text,
          \`owner\` text,
          \`status\` text NOT NULL,
          \`priority\` text NOT NULL,
          \`due_date\` text,
          \`artifact_ids\` text NOT NULL,
          \`source_spans\` text NOT NULL,
          \`metadata\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`fk_legal_task_matter_id\` FOREIGN KEY (\`matter_id\`) REFERENCES \`legal_matter\`(\`id\`) ON DELETE CASCADE
        );
      `)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_task_matter_status_idx\` ON \`legal_task\` (\`matter_id\`,\`status\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_task_matter_due_idx\` ON \`legal_task\` (\`matter_id\`,\`due_date\`);`)

      yield* tx.run(`
        CREATE TABLE IF NOT EXISTS \`legal_audit_event\` (
          \`id\` text PRIMARY KEY,
          \`matter_id\` text NOT NULL,
          \`actor\` text NOT NULL,
          \`action\` text NOT NULL,
          \`target_type\` text NOT NULL,
          \`target_id\` text NOT NULL,
          \`metadata\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          CONSTRAINT \`fk_legal_audit_event_matter_id\` FOREIGN KEY (\`matter_id\`) REFERENCES \`legal_matter\`(\`id\`) ON DELETE CASCADE
        );
      `)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_audit_event_matter_time_idx\` ON \`legal_audit_event\` (\`matter_id\`,\`time_created\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_audit_event_target_idx\` ON \`legal_audit_event\` (\`target_type\`,\`target_id\`);`)

      yield* tx.run(`
        CREATE TABLE IF NOT EXISTS \`legal_agent_action\` (
          \`id\` text PRIMARY KEY,
          \`matter_id\` text NOT NULL,
          \`role\` text NOT NULL,
          \`output_kind\` text NOT NULL,
          \`prompt_summary\` text NOT NULL,
          \`context_artifact_ids\` text NOT NULL,
          \`context_source_ids\` text NOT NULL,
          \`output_artifact_id\` text,
          \`verification_status\` text NOT NULL,
          \`human_approval\` text NOT NULL,
          \`confidence\` text NOT NULL,
          \`unresolved_questions\` text NOT NULL,
          \`metadata\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`fk_legal_agent_action_matter_id\` FOREIGN KEY (\`matter_id\`) REFERENCES \`legal_matter\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_legal_agent_action_artifact_id\` FOREIGN KEY (\`output_artifact_id\`) REFERENCES \`legal_artifact\`(\`id\`) ON DELETE SET NULL
        );
      `)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_agent_action_matter_role_idx\` ON \`legal_agent_action\` (\`matter_id\`,\`role\`);`)
      yield* tx.run(`CREATE INDEX IF NOT EXISTS \`legal_agent_action_matter_output_idx\` ON \`legal_agent_action\` (\`matter_id\`,\`output_kind\`);`)
    })
  },
} satisfies DatabaseMigration.Migration
