# LegalCode Product Reliability Roadmap

LegalCode is a local-first legal coworker for solo litigators, starting with US litigation. The product should feel like a matter command center with Google Docs-style legal documents, Google Sheets-style legal work tables, and supervised legal agents that help draft, classify, extract, and verify without taking final legal responsibility away from the human user.

The implementation benchmark is trust, not raw automation. Every product surface should make it easy to answer: what matter was used, what source supports this claim, what remains uncertain, who approved it, and what changed.

## Launch Posture

- **Primary user:** US solo litigators.
- **First wedge:** Multi-role legal coworker for litigation matters.
- **Deployment:** Local-first desktop with encrypted cloud sync when collaboration is enabled.
- **Default legal stance:** Human-in-the-loop supervised automation.
- **Jurisdiction sequence:** US litigation first, India litigation next, other jurisdictions later.

## Matter Command Center

Matter workspaces should collect the records a solo litigator needs to run a case:

- parties,
- claims,
- deadlines,
- documents,
- evidence,
- research,
- pleadings,
- notes,
- tasks,
- audit log.

Matter data is private by default. Cloud sync and collaboration are matter-level choices, not ambient sharing behavior.

## Legal Coworkers

LegalCode exposes role-specific agents instead of one generic legal assistant:

- Case Strategist,
- Research Clerk,
- Drafting Clerk,
- Discovery Analyst,
- Citation Checker,
- Deadline Clerk,
- Evidence Chronologist,
- Settlement Analyst,
- Filing Assistant,
- Workspace Integrator.

Every agent must declare the selected matter artifacts and sources it reads, what it intends to produce, and whether the output is a draft, suggestion, comment, extraction, or final candidate. Final candidates still require human approval before filing/export.

## Trust Layer

All AI output that cites law or facts must carry:

- source spans,
- confidence,
- unresolved questions,
- verification status,
- a verify-before-filing posture until approved.

Acceptance gates:

- No AI-generated legal citation may be shown as verified unless it resolves to a stored source.
- No quote may be shown as verified unless it matches the cited source span.
- No final/export action may proceed without a human approval marker.
- No agent may read outside the selected matter scope.

## Source Registry And BYOK

LegalCode OSS uses bring-your-own-key or bring-your-own-account source integrations. The open-source build must not bundle paid legal data, shared legal research credentials, or hosted proxy access to licensed systems.

Initial source tiers:

- matter uploads and workspace files,
- official primary sources,
- open primary sources,
- licensed sources through user-owned subscriptions,
- unofficial secondary sources as research leads only.

Every imported source should record authority level, jurisdiction, locator, retrieval time, content hash, parser or capture method, license or terms note, source spans, verification status, and freshness. The machine-readable source profile catalog is exposed at `GET /api/legalcode/source-integrations`.

Computer use is allowed only as supervised BYOK browser work. It may navigate legal research systems, court portals, and filing sites with the user's account, but it may not submit filings, incur fees, upload documents, bypass access controls, or capture restricted content without human approval and audit logging.

## Litigation Workflows

V1 workflows should be litigation-native:

- complaint drafting,
- answer drafting,
- motion outline,
- discovery request/response drafting,
- deposition prep,
- chronology builder,
- issue memo,
- exhibit list,
- privilege log,
- demand letter,
- settlement brief,
- hearing prep.

Each workflow should produce lawyer-reviewable artifacts with source traceability, confidence, unresolved questions, and explicit next steps.

## Legal Documents

Use ProseMirror as the document foundation and Yjs for collaboration state.

V1 supports:

- comments,
- suggestions,
- version snapshots,
- source anchors,
- agent provenance marks,
- DOCX export,
- PDF export.

Later work can add high-fidelity Word tracked-change round trips and advanced redline fidelity.

## Legal Sheets

Build structured legal sheets before spreadsheet parity. V1 sheets are typed matter work tables:

- issue logs,
- evidence registers,
- discovery trackers,
- deadline trackers,
- damages tables,
- privilege logs,
- obligation trackers,
- diligence request lists,
- clause matrices,
- risk registers.

Sheets should support cell and range comments, owner/status/severity/date fields, document excerpt links, source spans, confidence, and agent extraction provenance.

## Collaboration And Sync

Collaboration is invite-based matter collaboration, not public link sharing.

Durable records:

- matter,
- artifact,
- document revision,
- sheet revision,
- comment thread,
- citation,
- deadline,
- task,
- audit event,
- agent action.

Realtime signals:

- presence,
- cursor,
- selection,
- active cell,
- typing,
- agent streaming state.

The server is authoritative for identity, invites, permissions, audit log, matter membership, and version restore. Local desktop storage remains the first-class working surface.

## Product API

The machine-readable version of this roadmap is exposed at:

- `GET /api/legalcode/product-roadmap`
- `GET /api/legalcode/source-integrations`

The roadmap endpoint returns the launch assumptions, trust policy, document engine profile, sheet engine profile, agent broker policy, collaboration policy, source registry policy, supervised computer-use policy, and milestone acceptance criteria. The source integrations endpoint returns the BYOK source provider catalog and source/computer-use rules. UI work should consume these contracts instead of re-encoding roadmap constants in page components.
