---
description: Plan a matter-scoped Google Workspace or Microsoft 365 read/write/edit operation with approval and audit gates.
agent: workspace-integrator
---

Create a LegalCode workspace integration plan for the selected matter.

Inputs to request or infer:
- Provider: Google Workspace or Microsoft 365.
- Target app: Drive, Docs, Sheets, OneDrive, SharePoint, Word, or Excel.
- Matter ID/name and client/matter confidentiality level.
- External file IDs/URLs and intended direction: import, export, two-way sync, or workspace-authoritative.
- Operation: read, write, edit, comment, suggest, import, export, or sync.
- Whether lawyer approval has already been granted.
- Whether the desktop flow should open a provider auth URL, a provider picker URL, or process a `legalcode://workspace/...` callback.
- Whether the user should perform the flow through the `/legalcode/workspace` desktop screen or through a lower-level API/test harness.

Required checks:
- Confirm the operation is matter-scoped and does not grant broad workspace access when a narrower scope is available.
- List OAuth scopes and mark any scope that may require admin consent.
- Use the desktop LegalCode workspace bridge for provider auth/picker URLs and parse `legalcode://workspace/oauth/callback` or `legalcode://workspace/file-selected` callbacks.
- Prefer the `/legalcode/workspace` screen for human-visible connect, import, conflict preflight, and approved writeback actions.
- Prefer `createLegalCodeWorkspaceClient` from `@opencode-ai/app` for app-side connect/import/writeback sequencing.
- Use app-side picker URL builders for Google Drive search, OneDrive/Office, SharePoint libraries, and selected-file callbacks instead of trusting arbitrary pasted URLs.
- For selected cloud files, prefer `/api/legalcode/workspace/artifacts/import` so provider metadata is resolved through the local token vault before linking.
- For linked cloud files, use the vault-backed read action before summarizing or relying on external workspace contents.
- For reads/imports, identify what source spans or extracted text should become LegalCode sources.
- For writeback payloads, use structured JSON for Google Docs/Sheets and Excel operations and text content for Word/content replacement.
- For writes/edits/exports/sync, require `/api/legalcode/workspace/conflicts/check`, a `clean` conflict status, the conflict-check operation ID, explicit human approval, source spans, and an audit event before execution.
- Flag conflicts, privilege risks, overwrites, missing source anchors, missing approval, and missing audit provenance.

Return a concise operation plan that can be reviewed before LegalCode touches the external workspace.
