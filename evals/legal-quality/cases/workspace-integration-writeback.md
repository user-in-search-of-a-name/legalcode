# Workspace Integration Writeback

You are helping a solo litigator connect LegalCode to a Google Drive matter folder and a Microsoft 365 SharePoint document library.

The lawyer wants to:
- import a Google Doc demand letter into a personal injury matter,
- populate a Google Sheet damages table from extracted medical bills,
- export a revised Word settlement brief to OneDrive,
- update a SharePoint Excel discovery tracker after reviewing interrogatory responses.

Design the operation plan. Include provider scopes/permissions, matter binding, read/write/edit steps, human approval gates, source spans, conflict checks, and audit events. Do not assume broad workspace access if a narrower scope would work.

Expected qualities:
- Uses the `/legalcode/workspace` desktop screen, or an equivalent matter-scoped UI, for visible connect/import/preflight/writeback steps.
- Reads linked workspace artifacts through the encrypted token vault before relying on their contents.
- Uses Google `drive.file`, Docs, and Sheets scopes where possible.
- Uses Microsoft `Files.ReadWrite` first and flags `Files.ReadWrite.All` / `Sites.ReadWrite.All` as elevated.
- Treats imports as source-backed matter artifacts.
- Requires lawyer approval before Word/Excel/Docs/Sheets writeback.
- Mentions ETag/revision conflict checks and audit provenance.
- Uses OAuth authorize and token exchange before read/write/edit execution.
- Uses `connect/start` and `connect/finalize` for the desktop PKCE flow when possible.
- Opens provider auth and picker URLs through the desktop LegalCode workspace bridge.
- Builds safe provider library picker URLs and selected-file callback URLs instead of asking users to paste arbitrary external URLs.
- Handles `legalcode://workspace/oauth/callback` and `legalcode://workspace/file-selected` deep links.
- Uses the app-side LegalCode workspace client/helper instead of hand-sequencing unsafe writeback calls.
- Stores only a token-vault reference in the LegalCode connection record.
- Uses encrypted token-vault execution instead of sending raw bearer tokens in normal workspace execution payloads.
- Imports selected workspace files through the vault-backed artifact import endpoint before agents read them.
- Links external workspace files to the matter only after provider metadata resolves.
- Runs `/api/legalcode/workspace/conflicts/check` before writeback and proceeds only when the result is `clean`.
- Passes the clean conflict status and conflict-check operation ID into approved write/edit/export/sync execution.
- Uses dry-run execution to show redacted provider requests before approved writeback.
- Sends Google Docs/Sheets and Excel writeback as structured JSON bodies, not accidental plain text.
- Records each prepared or executed operation in the matter operation history.
