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

Required checks:
- Confirm the operation is matter-scoped and does not grant broad workspace access when a narrower scope is available.
- List OAuth scopes and mark any scope that may require admin consent.
- For reads/imports, identify what source spans or extracted text should become LegalCode sources.
- For writes/edits/exports/sync, require explicit human approval and an audit event before execution.
- Flag conflicts, privilege risks, overwrites, missing source anchors, missing approval, and missing audit provenance.

Return a concise operation plan that can be reviewed before LegalCode touches the external workspace.
