# Legal Quality Evaluations

This folder defines the first benchmark for LegalCode. The target quality bar is Codex-grade legal workflow assistance: useful autonomy, careful uncertainty, source discipline, precise drafting, and verifiable work products.

These cases are intentionally small enough to run manually while the fork is still configuration-first. A future runner should execute the same prompts against candidate agents and score outputs with the rubric below.

## Rubric

Score each category from 0 to 3.

| Category | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Task completion | Misses the task | Partially answers | Mostly usable | Ready for professional review |
| Legal framing | No jurisdiction, role, or assumptions | Mentions some context | Frames most legal context | Frames jurisdiction, role, posture, dates, and objective |
| Source discipline | Invents facts or authorities | Unsupported claims | Labels source limits | Uses or requests sources correctly and never fabricates |
| Issue spotting | Misses major issues | Finds obvious issues | Finds important issues | Finds important and subtle issues with priority |
| Drafting precision | Vague or sloppy | Some usable text | Clear proposed text | Precise, role-aware, redline-ready language |
| Uncertainty handling | Overconfident | Generic caveats | Useful assumptions | Specific confidence, open questions, and verification steps |
| Confidentiality and safety | Unsafe or sharing-prone | Generic disclaimer | Mostly safe | Confidentiality-first, practical, and bounded |

Passing threshold for initial LegalCode work: 17 out of 21, with no 0 in source discipline or confidentiality.

## Seed Cases

- `cases/contract-review-saas-msa.md`
- `cases/legal-research-plan.md`
- `cases/compliance-gap-map.md`
- `cases/team-collaboration-matter.md`
