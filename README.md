# LegalCode

**Local-first AI workspace for litigation work.**

LegalCode is an open-source, legal-use desktop workspace built on the OpenCode runtime. It is designed for solo litigators and small legal teams who need AI assistance that stays matter-scoped, source-linked, human-approved, and private by default.

LegalCode is not a generic chatbot and not an unsupervised filing robot. It is a supervised legal coworker for drafting, research planning, discovery, evidence organization, deadline review, workspace file handling, and source verification. AI outputs are treated as drafts, suggestions, comments, extractions, or final candidates until a human approves them.

This fork is not built by, endorsed by, or affiliated with the OpenCode team.

[Download LegalCode Desktop](https://github.com/user-in-search-of-a-name/legalcode/releases/latest)

## Product Promise

LegalCode helps legal professionals move faster without losing control:

- **Matter-first:** client, parties, claims, documents, evidence, deadlines, tasks, notes, and audit events live inside a matter command center.
- **Trust-first:** citations, quotes, dates, exhibit references, and factual claims need source spans, confidence, unresolved questions, and verification status.
- **Local-first:** matter data starts on the user's machine; cloud sync and collaboration are explicit choices.
- **Human-approved:** no final/export/filing-ready output proceeds without a human approval marker.
- **BYOK/BYOA:** open-source data integrations use bring-your-own-key or bring-your-own-account mode. No bundled paid legal data or shared vendor credentials.
- **Collaboration-ready:** LegalCode is moving toward Google Docs-style legal documents and Google Sheets-style legal work tables with comments, suggestions, permissions, versions, and audit logs.

## Positioning

**For US solo litigators first. India litigation next. Other jurisdictions later.**

The first product wedge is litigation support:

- complaint and answer drafting,
- motion outlines,
- discovery requests and responses,
- deposition prep,
- evidence chronologies,
- issue memos,
- exhibit lists,
- privilege logs,
- demand letters,
- settlement briefs,
- hearing prep,
- filing readiness checks.

## Current Foundation

This repository already includes LegalCode-specific product scaffolding:

- legal operating instructions and specialist agents in `.opencode/`,
- matter/workspace/source/citation/deadline/task/audit/agent-action domain contracts,
- Google Workspace and Microsoft 365 workspace integration contracts,
- BYOK legal source integration policy,
- optional MemPalace-style local memory policy,
- US and India litigation jurisdiction pack seeds,
- legal quality evals and golden matter fixtures.

Start here:

- [LegalCode Edition](docs/legal-edition.md)
- [Product Reliability Roadmap](docs/product-reliability-roadmap.md)
- [Desktop Collaboration](docs/desktop-collaboration.md)
- [Workspace Integrations](docs/workspace-integrations.md)
- [Source Integrations](docs/source-integrations.md)
- [Memory Integrations](docs/memory-integrations.md)
- [Download LegalCode Desktop](docs/download.md)
- [Brand Guide](docs/brand.md)

---

### Development Status

LegalCode is in product-foundation stage. The repo contains the domain contracts, API metadata, operating instructions, jurisdiction seeds, evaluation cases, and early workspace integration flows needed to build toward a standalone desktop product.

The next user-ready milestones are:

1. matter CRUD and matter command center,
2. encrypted local matter storage,
3. document ingestion with source anchors,
4. trust dashboard for citations, quotes, deadlines, and filing readiness,
5. legal document and legal sheet editors,
6. invite-based collaboration and audit-backed sync.

### Local Development

This repo uses Bun workspaces.

```bash
bun install
bun typecheck
bun --cwd packages/app dev
bun --cwd packages/desktop dev
```

Tests should be run from package directories, not from the repo root.

### LegalCode Desktop App

LegalCode Desktop is the intended primary surface. The app should open into the matter command center, not a generic chat or terminal view.

Public download URL:

[Download LegalCode Desktop](https://github.com/user-in-search-of-a-name/legalcode/releases/latest)

Maintainers can publish free installers by running the `legalcode desktop release` GitHub Actions workflow with a version tag.

Planned package names:

| Platform              | Artifact                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `legalcode-desktop-mac-arm64.dmg`  |
| macOS (Intel)         | `legalcode-desktop-mac-x64.dmg`    |
| Windows               | `legalcode-desktop-win-x64.exe`     |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

### Legal Coworkers

LegalCode uses role-specific coworkers for legal tasks:

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

Each coworker must stay matter-scoped, declare what it reads, produce source-linked output where facts or law are involved, and keep final legal work human-approved.

### Upstream Runtime

LegalCode is built on the OpenCode runtime and keeps the upstream architecture where possible. Upstream OpenCode documentation and contribution practices remain useful for runtime-level development, but LegalCode's product direction, branding, legal guardrails, and collaboration model are defined in this repository.

OpenCode upstream: <https://github.com/anomalyco/opencode>

### Contributing

Contributions should preserve LegalCode's product posture:

- local-first,
- matter-scoped,
- source-linked,
- human-approved,
- BYOK/BYOA for external data,
- no public sharing by default,
- no claims of replacing qualified legal counsel.
