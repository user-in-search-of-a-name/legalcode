# LegalCode Edition

LegalCode is a legal-use customization layer for OpenCode. It keeps the upstream agent runtime intact and adds legal workflows, specialist agents, confidentiality defaults, and a quality benchmark modeled on Codex-level execution.

This fork is not built by, endorsed by, or affiliated with the OpenCode team.

## Product Goal

Give legal professionals an agentic workspace that can:

- review contracts and generate redline-ready comments,
- draft clauses, policies, checklists, and matter briefs,
- plan and summarize legal research,
- map compliance obligations to controls and evidence,
- co-edit legal documents and structured matter sheets with teammates,
- manage solo-litigator matter workflows with deadlines, evidence chronologies, pleadings, discovery, settlement, and filing readiness,
- organize legal operations workflows with disciplined source handling.

The first version intentionally lives in `.opencode` configuration rather than core runtime code. That keeps the fork maintainable while we validate the legal workflows.

## Quality Benchmark

Use Codex as the quality bar:

- **Autonomy:** Move work forward without endless clarification, but do not guess material legal facts.
- **Source discipline:** Never invent authorities, citations, quotes, deadlines, or document text.
- **Uncertainty:** Label assumptions, confidence, unresolved questions, and date-sensitive issues.
- **Precision:** Preserve defined terms, cross-references, party roles, jurisdiction, and commercial intent.
- **Verification:** Re-read relevant documents before finalizing high-stakes analysis or edits.
- **Usability:** Prefer structured legal outputs that a lawyer can review, revise, and send onward.

## Current Customization Surface

- `.opencode/instructions/legal-edition.md` adds ambient legal/privacy operating rules.
- `.opencode/skills/legal-quality/SKILL.md` adds a reusable legal quality skill.
- `.opencode/agent/legal.md` defines the primary legal workbench.
- `.opencode/agent/legal-research.md` defines a research subagent.
- `.opencode/agent/contract-reviewer.md` defines a contract review subagent.
- `.opencode/agent/compliance-auditor.md` defines a compliance audit subagent.
- `.opencode/command/legal-contract-review.md` adds a reusable contract review workflow.
- `.opencode/command/legal-research.md` adds a reusable research workflow.
- `.opencode/command/legal-compliance-check.md` adds a compliance mapping workflow.
- `.opencode/command/legal-matter-brief.md` adds a matter briefing workflow.
- `.opencode/command/legal-source-import.md` adds a BYOK source import and supervised computer-use retrieval workflow.
- `evals/legal-quality/README.md` defines the initial quality rubric and seed benchmark cases.
- `docs/desktop-collaboration.md` defines the standalone desktop and Google Docs/Sheets-style team collaboration architecture.
- `docs/memory-integrations.md` defines optional local memory provider policy, with MemPalace as the first planned provider.
- `docs/product-reliability-roadmap.md` defines the US-litigation-first LegalCode product roadmap, trust layer, document/sheet engines, collaboration policy, and acceptance gates.
- `docs/source-integrations.md` defines bring-your-own-key/account legal source integrations and supervised computer-use rules for OSS.
- `docs/workspace-integrations.md` defines matter-scoped Google Workspace and Microsoft 365 read/write/edit integration rules.
- `jurisdictions/us-litigation.json` starts the active US litigation jurisdiction pack.
- `jurisdictions/india-litigation.json` starts the planned India litigation jurisdiction pack.
- `GET /api/legalcode/product-roadmap` exposes the roadmap as machine-readable LegalCode capability metadata.
- `GET /api/legalcode/source-integrations` exposes BYOK source profiles, source registry requirements, and supervised computer-use policy.
- `GET /api/legalcode/memory-integrations` exposes optional local memory provider policy and MemPalace controls.

## Default Legal Guardrails

- Session sharing is disabled in `.opencode/opencode.jsonc`.
- Legal agents ask before editing files or running shell commands where appropriate.
- Research and compliance subagents are read-only by default.
- All legal work must separate facts, assumptions, authorities, analysis, and recommendations.

## Roadmap

1. Complete the LegalCode domain foundation for matters, artifacts, sources, citations, deadlines, tasks, audit events, agent actions, workflows, legal documents, legal sheets, and trust gates.
2. Add encrypted local SQLite matter storage for metadata, artifact index, extracted text, audit queue, and encrypted cache.
3. Build the matter command center for US solo litigators with parties, claims, deadlines, documents, evidence, research, pleadings, notes, tasks, and audit log.
4. Add the trust dashboard for source spans, citation verification, quote checks, unresolved questions, filing readiness, and human approval.
5. Add the BYOK source registry for matter uploads, official sources, open legal APIs, licensed research accounts, and supervised computer-use captures.
6. Add optional local memory with MemPalace-style matter continuity, visible retrieval, and matter-scoped agent diaries.
7. Add ProseMirror/Yjs legal documents with comments, suggestions, source anchors, version snapshots, and DOCX/PDF export.
8. Add Yjs-backed structured legal sheets for issue logs, evidence registers, discovery trackers, deadlines, damages, and privilege logs.
9. Add the permissioned agent broker so every legal coworker declares matter reads, outputs, confidence, verification status, and provenance.
10. Add invite-based encrypted cloud sync for presence, comments, document/sheet updates, audit events, permissions, and version restore.
11. Expand jurisdiction packs after US litigation, with India litigation as the next pack.
