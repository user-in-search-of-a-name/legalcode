# LegalCode Matter OS

LegalCode Matter OS is the free, open-source operating surface for legal work inside LegalCode Desktop. It is not a clone of any proprietary legal AI platform. It is LegalCode's local-first interpretation of the same product category: a connected legal workspace where lawyers, matter files, legal agents, documents, tables, sources, and trust controls work together.

## Free OSS Promise

LegalCode Matter OS should be useful without a sales call:

- free desktop app,
- local-first matter workspace,
- bring-your-own model keys,
- bring-your-own legal data accounts,
- matter uploads and workspace files,
- source-linked drafts,
- legal documents and legal sheets,
- audit trail and human approval controls.

The OSS version must not bundle paid legal databases, shared vendor keys, hidden proxy credentials, or public sharing defaults for confidential matter data.

## Product Layers

| Layer | LegalCode implementation |
| --- | --- |
| Model layer | BYOK providers such as OpenAI, Anthropic, Gemini, OpenRouter, or local models |
| Agent layer | Case Strategist, Research Clerk, Drafting Clerk, Discovery Analyst, Citation Checker, Deadline Clerk, Evidence Chronologist, Settlement Analyst, Filing Assistant, Workspace Integrator |
| Matter layer | Parties, claims, deadlines, documents, evidence, research, pleadings, notes, tasks, audit log |
| Knowledge layer | User playbooks, precedent folders, templates, prior matter notes, optional local memory |
| Source layer | Matter uploads, official primary sources, open legal APIs, licensed accounts, supervised computer-use captures |
| Interface layer | Matter OS dashboard, legal docs, legal sheets, workspace integrations, chat sessions |
| Governance layer | Matter scope, source spans, citation checks, quote verification, approvals, audit events, permissions |

## First Product Screen

The first in-app version lives at:

```text
/legalcode/matter-os
```

It should become the launch surface for lawyers who want to:

1. Select a matter.
2. Choose a legal coworker.
3. Pick a litigation workflow.
4. Attach matter sources.
5. Generate lawyer-reviewable output.
6. Verify citations, quotes, facts, deadlines, and approvals before export.

## Reliability Contract

LegalCode Matter OS must keep these gates visible:

- no verified citation without a resolving source,
- no verified quote without matching source text,
- no final/export action without human approval,
- no agent read outside selected matter scope,
- no external account use without BYOK/BYOA credentials,
- no public legal artifact sharing by default.

## Near-Term Build Order

1. Matter OS dashboard with live capability metadata.
2. Matter CRUD and local SQLite-backed records.
3. Document ingestion and source extraction.
4. Legal workflow launcher that creates matter-scoped agent sessions.
5. Source/quote/citation trust panel.
6. Legal document editor and legal sheet engine.
7. Invite-based collaboration and encrypted sync.
