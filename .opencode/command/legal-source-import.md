---
description: Plan a BYOK legal source import or supervised computer-use retrieval for a matter.
agent: legal
---

Create a LegalCode source import plan for the selected matter.

Inputs to request or infer:
- Matter ID/name and confidentiality level.
- Source tier: matter upload, official primary, open primary, licensed source, or unofficial secondary.
- Jurisdiction and forum.
- Source locator: file path, URL, docket number, citation, account portal, or workspace artifact.
- Access mode: local file, public API, API key, OAuth, user account, browser session, or manual upload.
- Whether the user has supplied the required key/account/session.
- Whether supervised computer use is needed.

Required checks:
- Use bring-your-own-key/account mode only for OSS. Do not assume bundled paid legal data or shared vendor credentials.
- Prefer authority in this order: matter records, official primary sources, open primary sources, licensed sources through the user's own account, then unofficial secondary sources as research leads.
- Record source type, jurisdiction, authority level, locator, retrieval time, hash, parser/capture method, license or terms note, source spans, verification status, and freshness.
- For API keys, identify the expected user-controlled env var or vault entry.
- For licensed systems, confirm the user's own subscription/account and avoid bulk scraping or terms-violating exports.
- For computer use, keep the browser visible and audited; require human approval before login, paid download, document upload, filing submission, external writeback, or restricted-content capture.
- Do not bypass CAPTCHA, access controls, paywalls, rate limits, or restricted/sealed access.
- Downloaded files, screenshots, and extracted page text become matter sources only after audit, hash, locator, retrieval time, and authority level are recorded.

Return a concise source import plan with authority level, access method, approval gates, audit events, and how source spans will be created.
