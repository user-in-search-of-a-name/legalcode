# LegalCode Source Integrations

LegalCode OSS uses a bring-your-own-key or bring-your-own-account model. The open-source build must not ship paid legal datasets, shared API keys, shared research credentials, or hosted proxy access to licensed content.

The goal is simple: let a lawyer connect their own matter documents, official sources, public legal APIs, and licensed subscriptions while LegalCode preserves source spans, authority level, retrieval time, hashes, terms notes, and audit events.

## Source Tiers

LegalCode source handling follows this authority order:

1. **Matter records:** Uploaded pleadings, contracts, exhibits, correspondence, medical records, invoices, emails, and workspace files selected by the user.
2. **Official primary sources:** GovInfo, Federal Register, eCFR, PACER, official court sites, official state/federal rules, India Code, eGazette, Supreme Court/High Court/tribunal sites.
3. **Open primary sources:** CourtListener, RECAP, Caselaw Access Project, and similar open legal corpora.
4. **Licensed sources:** Westlaw, Lexis, Bloomberg Law, Fastcase, vLex, SCC Online, Manupatra, and similar systems using the user's own subscription.
5. **Unofficial secondary sources:** Legal blogs, firm memos, commentary, and mirrors. These are research leads unless verified against primary sources.

## Required Metadata

Every imported source should record:

- source type,
- jurisdiction,
- authority level,
- locator,
- retrieval time,
- content hash,
- parser or capture method,
- license or terms note,
- source spans,
- verification status,
- freshness date.

No generated legal claim should be marked verified without a source span or a recorded unresolved question.

## Supported Profiles

The machine-readable profile catalog is exposed at:

- `GET /api/legalcode/source-integrations`

Initial profiles:

- Matter Uploads,
- GovInfo,
- Federal Register and eCFR,
- CourtListener and RECAP,
- PACER,
- Caselaw Access Project,
- Licensed Research Platforms,
- India Official Legal Sources.

Profiles declare access mode, credential mode, allowed uses, prohibited uses, source-span support, freshness expectations, and audit requirements.

## BYOK Rules

- API keys live in user-controlled env vars, local encrypted vaults, or OS keychains.
- OAuth and account sessions must be user-owned.
- Licensed research systems are bring-your-own-account only.
- LegalCode OSS cannot proxy shared access to paid systems.
- LegalCode OSS cannot train on licensed content unless the user has separate rights and explicitly configures that outside the default product path.

Recommended environment variables:

- `LEGALCODE_GOVINFO_API_KEY`
- `LEGALCODE_COURTLISTENER_API_KEY`

## Computer Use

Computer use is allowed as a supervised bridge for court portals and legal research systems when APIs are absent or insufficient.

Allowed:

- navigate approved legal research, court, filing, and workspace sites,
- download user-authorized public or account-accessible documents,
- check docket updates and official rules pages,
- capture screenshots and page text into matter audit events,
- prepare filing or portal forms for human review.

Prohibited:

- submitting filings without the user's final click,
- bypassing CAPTCHA, access controls, paywalls, or rate limits,
- storing passwords outside the encrypted vault or OS credential store,
- accessing sealed, restricted, or privileged materials without explicit user authorization,
- scraping licensed research systems at scale or against terms,
- uploading or sharing matter documents without human approval.

Human approval is required before login, paid download, document upload, filing submission, external writeback, and capture of restricted matter content.

## Acceptance Gates

- No OSS build ships paid legal data or shared vendor credentials.
- No account-based source runs without a user-provided key, OAuth grant, account session, or manual upload.
- No source import is usable until locator, retrieval time, authority level, and hash are recorded.
- No computer-use download becomes a matter source until it is audited and hashed.
- No portal action with legal consequences proceeds without a human approval marker.
