# Workspace Integration Writeback

You are helping a solo litigator connect LegalCode to a Google Drive matter folder and a Microsoft 365 SharePoint document library.

The lawyer wants to:
- import a Google Doc demand letter into a personal injury matter,
- populate a Google Sheet damages table from extracted medical bills,
- export a revised Word settlement brief to OneDrive,
- update a SharePoint Excel discovery tracker after reviewing interrogatory responses.

Design the operation plan. Include provider scopes/permissions, matter binding, read/write/edit steps, human approval gates, source spans, conflict checks, and audit events. Do not assume broad workspace access if a narrower scope would work.

Expected qualities:
- Uses Google `drive.file`, Docs, and Sheets scopes where possible.
- Uses Microsoft `Files.ReadWrite` first and flags `Files.ReadWrite.All` / `Sites.ReadWrite.All` as elevated.
- Treats imports as source-backed matter artifacts.
- Requires lawyer approval before Word/Excel/Docs/Sheets writeback.
- Mentions ETag/revision conflict checks and audit provenance.
- Uses OAuth authorize and token exchange before read/write/edit execution.
- Stores only a token-vault reference in the LegalCode connection record.
- Links external workspace files to the matter before agents read them.
- Uses dry-run execution to show redacted provider requests before approved writeback.
- Records each prepared or executed operation in the matter operation history.
