# Standalone Desktop And Team Collaboration

LegalCode should become a standalone desktop app for legal teams, not only a branded OpenCode shell. The collaboration model should feel closer to Google Docs and Google Sheets than to a chat transcript: multiple people can work inside the same matter, co-edit documents and tables, discuss changes, and ask LegalCode agents to help with drafting, review, research, and compliance.

## Product Shape

LegalCode Desktop has six primary surfaces:

- **Matter workspace:** A shared container for clients, projects, disputes, deals, or compliance initiatives.
- **Legal documents:** Rich-text documents for contracts, memos, policies, briefs, playbooks, and research notes.
- **Legal sheets:** Structured tables for obligation trackers, diligence lists, clause matrices, issue logs, privilege logs, and compliance controls.
- **Agent panel:** LegalCode agents that can read selected matter context, draft into documents, populate sheets, summarize threads, and propose edits.
- **Trust dashboard:** Citation, quote, deadline, source-span, and human-approval status across the matter.
- **Workspace connectors:** Matter-scoped Google Workspace and Microsoft 365 links for selected Drive, Docs, Sheets, OneDrive, SharePoint, Word, and Excel artifacts.

The app should support offline-first local work and online team collaboration. Desktop remains the primary professional surface; web access can follow as a companion for review and comments.

## Collaboration Model

Use CRDT-backed collaboration for user-authored documents and sheets. The application state should separate durable legal records from transient collaboration signals.

### Durable Records

- `organization`: billing, policy, retention, and identity boundary.
- `team`: group membership and role templates.
- `matter`: workspace, client/matter metadata, security classification, retention policy.
- `artifact`: document, sheet, uploaded file, agent output, or saved research trail.
- `document_revision`: durable snapshots and named versions.
- `sheet_revision`: durable snapshots and named versions.
- `comment_thread`: anchored comments, questions, approvals, and resolved issues.
- `citation`: source reference, authority, contract excerpt, document location, or research source.
- `audit_event`: immutable record of access, export, share, edit, agent action, and permission changes.

### Real-Time Signals

- cursor position,
- text selection,
- active cell or range,
- user presence,
- typing indicator,
- draft comment state,
- agent streaming state.

Transient signals should not be treated as legal records. They can expire quickly and should not pollute matter audit history.

## Permission Model

Legal collaboration needs stricter controls than general-purpose docs:

| Role | Default Access |
| --- | --- |
| Owner | Manage matter, members, exports, retention, and billing |
| Counsel | Edit legal docs/sheets, run agents, approve final versions |
| Reviewer | Comment and suggest, no direct final-text edits |
| Client | View/comment selected artifacts only |
| External Counsel | Scoped access by matter and artifact |
| Auditor | Read-only access to selected artifacts and audit logs |

Permissions should support matter-level defaults and artifact-level overrides. Agent access must be explicit: an agent can only read the matter, artifact, selection, or folder granted for the current request.

## Legal Document Features

Legal documents need more than generic rich text:

- clause and heading outline,
- defined-term detection,
- cross-reference tracking,
- comments and suggested edits,
- redline compare,
- version labels,
- citations and source links,
- signature blocks,
- export to DOCX/PDF,
- agent-drafted language with provenance.

Initial implementation can use a ProseMirror/Tiptap-style editor with a CRDT provider. Contract comparison and DOCX fidelity can be layered in after collaborative editing is stable.

## Legal Sheet Features

Legal sheets should be optimized for matter workflows rather than arbitrary spreadsheets:

- issue log,
- diligence request list,
- obligation tracker,
- compliance control map,
- clause matrix,
- evidence register,
- privilege log,
- risk register.

Each sheet should support comments on cells/ranges, dropdown fields, owners, due dates, status, severity, links to document excerpts, and agent-assisted extraction.

## Agent Collaboration Rules

Agents should act like high-trust collaborators with explicit provenance:

- Read only the matter context selected by the user or allowed by policy.
- Write proposed changes as suggestions unless the user grants direct edit permission.
- Attach source spans or citations to factual/legal claims.
- Create comments when confidence is low or a human decision is needed.
- Maintain an agent action trail: prompt summary, context used, output target, and user acceptance/rejection.
- Never train or externalize private matter content without an explicit enterprise policy and user-controlled connector.

## Sync Architecture

Recommended slices:

1. **Local desktop store:** SQLite for matter metadata, artifacts, comments, audit queue, and encrypted local cache.
2. **CRDT document state:** one CRDT document per legal document and one per sheet.
3. **Collaboration service:** WebSocket sync for CRDT updates, awareness/presence, comments, and locks for export/finalization workflows.
4. **Server authority:** permission checks, immutable audit log, version snapshots, retention, and team membership.
5. **Agent broker:** mediates agent access to matter context and records provenance.

Keep chat/session sharing separate from legal artifact sharing. LegalCode should not reuse public session-share semantics for confidential matter collaboration.

## External Workspace Editing

Google Workspace and Microsoft 365 integrations should be optional, matter-scoped, and approval-gated:

- Reads/imports can happen after a user selects or links external files to a matter.
- Writes/edits/exports/syncs require explicit human approval, an audit event, and conflict checks against external revision metadata.
- Google Workspace should prefer `drive.file` plus Docs/Sheets scopes over full-drive access.
- Microsoft 365 should prefer OneDrive `Files.ReadWrite`; SharePoint or tenant-wide permissions should be elevated/admin-reviewed.
- Agents may propose comments, suggestions, or document/table edits, but they do not silently overwrite external workspace content.

## MVP Sequence

1. Rebrand desktop shell and app identity to LegalCode.
2. Add local matter workspace model and matter home.
3. Add litigation trust dashboard for sources, citations, deadlines, and filing readiness.
4. Add document artifact view with comments and version history.
5. Add sheet artifact view for issue lists, evidence chronologies, discovery trackers, deadlines, damages tables, and privilege logs.
6. Add agent provenance and suggested-edits workflow.
7. Add real-time presence and comment sync.
8. Add Google Workspace and Microsoft 365 connection setup, file linking, import/export, and approval-gated writeback.
9. Add CRDT co-editing for legal documents.
10. Add CRDT co-editing for legal sheets.
11. Add team roles, invites, artifact-level permissions, export, audit log, and retention controls.

The canonical machine-readable sequence lives in `GET /api/legalcode/product-roadmap`. UI surfaces should prefer that endpoint for workflow lists, legal sheet types, trust requirements, and milestone acceptance criteria.

## Non-Negotiables

- Matter data is private by default.
- Sharing is invite-based, not public-link-first.
- Every agent action that reads or writes matter content is attributable.
- Legal sources and document excerpts remain traceable.
- Offline edits must reconcile without silent data loss.
- Final/exported versions must be reproducible from durable snapshots.
- External workspace edits must be approved, audit-backed, and conflict-checked before writeback.
