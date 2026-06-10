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
- `evals/legal-quality/README.md` defines the initial quality rubric and seed benchmark cases.
- `docs/desktop-collaboration.md` defines the standalone desktop and Google Docs/Sheets-style team collaboration architecture.

## Default Legal Guardrails

- Session sharing is disabled in `.opencode/opencode.jsonc`.
- Legal agents ask before editing files or running shell commands where appropriate.
- Research and compliance subagents are read-only by default.
- All legal work must separate facts, assumptions, authorities, analysis, and recommendations.

## Roadmap

1. Add legal document fixtures and evaluation tasks for contracts, policies, research memos, and compliance maps.
2. Add a benchmark runner that scores source fidelity, issue spotting, drafting quality, uncertainty handling, and confidentiality behavior.
3. Add document ingestion helpers for `.docx`, `.pdf`, and structured clause extraction.
4. Add optional integrations for matter management, DMS, e-signature, and legal research providers.
5. Build a legal-first UI profile that emphasizes documents, issue lists, citations, redlines, and approval workflow.
6. Add matter workspaces, legal documents, legal sheets, team presence, comments, permissions, and audit-backed collaboration.
