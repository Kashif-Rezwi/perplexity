# Product Roadmap

**Purpose**: This document tracks the development phases of the full-stack Perplexity clone from its initial MVP to future enterprise capabilities.
**Scope**: All backend infrastructure, API design, frontend UI, state management, and external integrations.
**Current Phase**: V2 (Usability Improvements)
**Usage**: Mark capabilities as `(Completed)` when fully integrated and deployed to the `main` branch.

---

## V1 - MVP Foundation (Completed)

Core capabilities required to make the first complete product loop work.

| Area | Capability | Purpose |
|---|---|---|
| **Backend** | Database persistence | Store threads, turns, sources, and citations (via PostgreSQL) |
| **Backend** | Web search & LLM | Retrieve external sources and generate answers (Tavily, OpenAI/Groq) |
| **Backend** | Core API endpoints | Ask a question, retrieve thread details, load per-turn sources, and delete threads |
| **Frontend** | Layout & design system | Two-column shell, styling tokens, typography, animations |
| **Frontend** | Core Thread UI | Submit questions, render markdown answers, render citation badges |
| **Frontend** | Sidebar & History | Local fallback thread history, navigation, and basic thread deletion |
| **Frontend** | UX Polish | Loading states, error handling, suggested follow-ups chips |

### V1 Verification Checklist

- Submit a new ask and confirm navigation to `/thread/:threadId`.
- Ask a follow-up and confirm the same thread receives a new turn.
- Click a citation and confirm the Links tab opens and highlights the matching source.
- Open the Links tab and confirm sources load from `GET /perplexity/sources?turnId=...`.
- Delete a thread and confirm the sidebar/cache history updates.
- Open `/history`, select a thread, and confirm the conversation loads.

## V2 - Usability Improvements

Enhancements that improve the client experience once the core flow is stable.

| Area | Capability | Purpose |
|---|---|---|
| **Backend/Frontend** | Streaming responses | Return and render answer tokens progressively via SSE |
| **Backend/Frontend** | Server-backed history | Load sidebar and `/history` from `GET /perplexity/threads`, with local history as an optimistic fallback |
| **Backend** | Pagination support | Load large lists such as thread history and source lists in stable chunks |
| **Backend/Frontend** | Expanded Thread Management | History-page delete, bulk delete, rename, archive/pin candidates, and richer server-backed history controls |

## V3 - Deployment Readiness

Operational work needed before the application is easier to run outside local development.

| Area | Capability | Purpose |
|---|---|---|
| **Backend** | Dockerized deployment | Package the backend and dependencies consistently |

## V4 - Research Intelligence

Higher-level reasoning features after the basic ask/search/answer loop is reliable.

| Area | Capability | Purpose |
|---|---|---|
| **Backend** | Deep Research agents | Run multi-step research workflows instead of a single search pass |

## V5 - Productization

Features needed when the product moves beyond a single-user V1 app.

| Area | Capability | Purpose |
|---|---|---|
| **Backend/Frontend** | Authentication | User login, sign-up flows |
| **Backend/Frontend** | Cloud Persistence | Migrate from local storage to fetching user-scoped threads |
| **Backend** | Billing / Limits | Control cost, rate limits, and paid usage |

## V6 - Architecture Scaling

Only needed when the modular monolith becomes a proven bottleneck.

| Area | Capability | Purpose |
|---|---|---|
| **Backend** | Microservices | Split specific capabilities into separate services |
