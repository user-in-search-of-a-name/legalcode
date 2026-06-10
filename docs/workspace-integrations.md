# Workspace Integrations

LegalCode supports Google Workspace and Microsoft 365 as matter-scoped external workspaces. The integration goal is simple: a lawyer can link, read, write, and edit legal documents and legal work tables where they already work, while LegalCode preserves local-first matter state, source traceability, human approval, and audit provenance.

## Supported Providers

### Google Workspace

Initial apps:
- Google Drive for file selection, metadata, import, export, and linked artifacts.
- Google Docs for pleadings, memos, comments, suggestions, and approved edits.
- Google Sheets for evidence registers, deadline trackers, discovery trackers, issue logs, damages tables, and privilege logs.

Default scopes:
- `openid email profile`
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/documents`
- `https://www.googleapis.com/auth/spreadsheets`

LegalCode should prefer `drive.file` over full-drive access unless a workspace admin intentionally enables broader matter library access.

### Microsoft 365

Initial apps:
- OneDrive for user-owned legal files.
- SharePoint for invited firm/team document libraries.
- Word for pleadings, memos, letters, and tracked legal drafts.
- Excel for structured legal trackers.

Default delegated permissions:
- `openid profile email offline_access User.Read`
- `Files.ReadWrite`
- `Files.ReadWrite.All`
- `Sites.ReadWrite.All`

LegalCode should prefer `Files.ReadWrite` for OneDrive matters. `Files.ReadWrite.All` and `Sites.ReadWrite.All` should be treated as elevated permissions and shown with admin-consent and confidentiality warnings.

## Local-First Data Model

Workspace access is represented by three durable LegalCode records:
- `WorkspaceConnection`: provider, account or tenant, scopes, enabled operation classes, token vault reference, status, and matter binding.
- `ExternalArtifact`: external file identity, title, app, URL, ETag/revision, sync direction, local artifact/source links, and approval status.
- `WorkspaceOperation`: read/write/edit/import/export/sync operation with actor, approval, source spans, output summary, and audit event link.

Tokens must not be stored directly in matter records. A connection stores only a `tokenVaultRef`; the token vault implementation can be local keychain first and cloud-managed only for enabled team collaboration.

The current local vault stores encrypted token blobs in the LegalCode data directory with file permissions restricted to the local user. Deployments should set `LEGALCODE_TOKEN_VAULT_KEY` or `OPENCODE_LEGALCODE_TOKEN_VAULT_KEY` from an OS keychain or enterprise secret manager. Without that variable, LegalCode derives a local machine-bound key from host/user/path information, which is acceptable only as a desktop bootstrap and not as enterprise key management.

## Operation Rules

Reads:
- Must be bound to a matter before agent use.
- Must create a source or artifact record when content is imported.
- Must record where extracted text came from.

Writes and edits:
- Require explicit human approval.
- Require an audit event.
- Must identify the target external artifact, operation, actor, and source spans that justify the change.
- Should use suggestions/comments when possible before direct content replacement.

Sync:
- Must declare direction: `import_only`, `export_only`, `two_way`, `legalcode_authoritative`, or `workspace_authoritative`.
- Must detect revision/ETag conflicts before writeback.
- Must never overwrite an external file when the local artifact is older than the workspace revision unless a lawyer approves conflict resolution.

## API Surface

`GET /api/legalcode/workspace-integrations` returns:
- Provider profiles for Google Workspace and Microsoft 365.
- Supported apps and operations.
- Default scopes/permissions.
- Risk controls.
- Operation plans for Drive, Docs, Sheets, OneDrive, SharePoint, Word, and Excel.

`POST /api/legalcode/workspace/oauth/authorize` builds a provider authorization URL from a client ID, redirect URI, state, optional PKCE challenge, optional tenant ID, and optional scopes.

`POST /api/legalcode/workspace/oauth/token` exchanges an authorization code for provider tokens. The response is intended for the desktop token vault; matter records should store only a `tokenVaultRef`.

`POST /api/legalcode/workspace/connect/start` is the preferred desktop start endpoint. It generates a PKCE `state`, `codeVerifier`, `codeChallenge`, authorization URL, scopes, and optional matter binding for Google Workspace or Microsoft 365.

The desktop renderer should open provider authorization URLs through `platform.legalcodeWorkspace.openAuthorizationURL(url)`. The Electron main process validates that authorization URLs target Google Accounts or Microsoft Login before opening the browser. OAuth redirects should return to `legalcode://workspace/oauth/callback?provider=...&code=...&state=...`, which the renderer parses as a LegalCode workspace deep link before calling `connect/finalize`.

App UI code should use `createLegalCodeWorkspaceClient` from `@opencode-ai/app` to call these endpoints. It wraps the local server credentials, opens provider auth/picker URLs through the desktop bridge when requested, imports selected files through the token vault, and runs writeback through conflict preflight before `execute-with-vault`.

`POST /api/legalcode/workspace/connect/finalize` is the preferred desktop callback endpoint. It exchanges the authorization code, stores returned tokens in the encrypted local vault, and creates the LegalCode workspace connection record with `tokenVaultRef`.

`POST /api/legalcode/workspace/tokens` encrypts and stores OAuth tokens in the local token vault and returns redacted token metadata plus a `tokenVaultRef`.

`GET /api/legalcode/workspace/tokens` lists redacted token-vault metadata. It never returns access, refresh, or ID tokens.

`DELETE /api/legalcode/workspace/tokens/:ref` removes a local token-vault entry.

`POST /api/legalcode/workspace/connections` persists a Google Workspace or Microsoft 365 connection record with account/tenant metadata, granted scopes, enabled operation classes, and the token-vault reference.

`GET /api/legalcode/workspace/connections` lists persisted provider connections, optionally filtered by matter and provider.

`POST /api/legalcode/workspace/artifacts` links a selected Drive, Docs, Sheets, OneDrive, SharePoint, Word, or Excel file to a LegalCode matter.

`POST /api/legalcode/workspace/artifacts/import` is the preferred picker handoff endpoint. The desktop sends the selected provider file ID, connection ID, matter ID, app, and `tokenVaultRef`; LegalCode resolves the token locally, reads provider metadata, records the import operation, and then links the file as an external matter artifact. Google imports use Drive `files.get` metadata, including shared-drive support; Microsoft imports use Graph `driveItem` metadata from OneDrive or the selected SharePoint site.

Provider file pickers or custom picker pages should be opened through `platform.legalcodeWorkspace.openPickerURL(url)`. The desktop validates known Google Drive, Microsoft 365, OneDrive, SharePoint, Office, or `legalcode://` callback URLs. Selected files should return as `legalcode://workspace/file-selected?provider=...&app=...&fileId=...` for Google files or `legalcode://workspace/file-selected?provider=...&app=...&itemId=...&siteID=...` for Microsoft Graph items.

`GET /api/legalcode/workspace/artifacts` lists external workspace files linked to a matter.

`POST /api/legalcode/workspace/conflicts/check` is the required writeback preflight. It resolves the artifact by `externalArtifactID`, reads current Google Drive or Microsoft Graph metadata through the local token vault, compares current ETag/revision values with the stored LegalCode artifact baseline, records the metadata-read operation, and returns `clean`, `conflict`, or `unknown`. Only `clean` may be passed to write/edit/export/sync execution, and execution must include the conflict-check operation ID for provenance.

`createLegalCodeWorkspaceClient.runApprovedWriteback(...)` is the app-side helper for approved writes. It calls `conflicts/check`, blocks non-clean results, carries forward the conflict-check operation ID, and then calls `execute-with-vault` with the current ETag/revision baseline.

`POST /api/legalcode/workspace/execute` executes or dry-runs a matter-scoped operation after the desktop supplies an access token from the vault. It prepares and calls:
- Google Drive metadata, Google Docs `batchUpdate`, and Google Sheets `batchUpdate`.
- Microsoft Graph OneDrive/SharePoint item, Word content, and Excel workbook endpoints.

Execution blocks write/edit/export/sync operations unless the request includes human approval, an audit event, source spans, `conflictStatus: "clean"`, and `conflictCheckOperationID`. Dry-runs return the redacted HTTP request without touching the external workspace.

`GET /api/legalcode/workspace/operations` lists recorded workspace operation history for a matter. `POST /api/legalcode/workspace/execute` records each prepared or executed operation in `legal_workspace_operation`.

`POST /api/legalcode/workspace/execute-with-vault` is the preferred execution path. It accepts a `tokenVaultRef`, resolves the bearer token inside the local vault, executes or dry-runs the operation, and records operation history without putting provider tokens in ordinary client payloads.

The next implementation layer should add OAuth callback/device flow UI, file picker handoff, and richer conflict-resolution screens.

## Acceptance Gates

- No workspace write/edit/export/sync operation runs without `humanApproval: approved`.
- No agent reads workspace content unless the external artifact is imported or linked to the selected matter.
- No broad provider scope is requested when a narrower provider-supported scope satisfies the requested operation.
- No imported quote or factual claim is presented as verified unless it has source spans.
- No workspace write/edit/export/sync operation runs unless the latest conflict preflight returned `clean`.
- No workspace write/edit/export/sync operation is considered complete unless it has an audit event.
- No ordinary matter, artifact, connection, or operation record may store raw provider tokens.

## Provider References

- Google OAuth scopes: https://developers.google.com/identity/protocols/oauth2/scopes
- Google Drive `files.get`: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get
- Microsoft Graph permissions: https://learn.microsoft.com/en-us/graph/permissions-reference
- Microsoft Graph `driveItem` metadata: https://learn.microsoft.com/en-us/graph/api/driveitem-get
