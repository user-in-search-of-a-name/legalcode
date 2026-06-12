# LegalCode Memory Integrations

LegalCode may use optional local memory to improve cross-session continuity, but memory is not a legal authority source. It helps the product remember prior drafting decisions, matter context, agent notes, and user preferences; it does not replace source registry validation.

## MemPalace

MemPalace is the first planned optional memory provider. It is local-first, stores verbatim text, supports local and self-hosted backends, and can be accessed through CLI, MCP stdio, Docker stdio, or self-hosted backend patterns.

LegalCode should integrate MemPalace through a connector/profile first, not by vendoring the Python project into this repository. That keeps dependency boundaries clean and lets users choose whether they want the additional local memory layer.

## Legal Boundaries

Memory must be:

- optional per installation,
- optional per matter,
- visible before injection into an agent prompt,
- matter-scoped by default,
- clearable by the user,
- excluded from legal authority verification unless tied back to source registry records.

Memory must not:

- store passwords, API keys, refresh tokens, or session cookies,
- cross client or matter boundaries without explicit user action,
- be treated as verified law or fact,
- train models by default,
- use external backends without explicit user opt-in and audit logging.

## Approved Uses

- Matter continuity across sessions.
- Agent diaries for role-specific coworkers.
- Prior user preferences and drafting choices.
- Local transcript search.
- Recalling why a litigation workflow, document structure, or source strategy was chosen.

## Required User Controls

- Enable or disable memory globally.
- Enable or disable memory per matter.
- Choose local or self-hosted backend.
- Clear matter memory.
- Inspect retrieved memories before agent injection.
- Exclude artifacts, folders, or source types from memory mining.

## Audit Events

- `memory_provider_connected`
- `memory_mined`
- `memory_retrieved`
- `memory_injected`
- `memory_disabled`
- `memory_cleared`

## Product API

The machine-readable memory policy is exposed at:

- `GET /api/legalcode/memory-integrations`

The endpoint returns supported providers, access modes, allowed/prohibited uses, required controls, audit events, and acceptance criteria.
