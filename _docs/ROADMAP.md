# Product Roadmap

**Purpose**: This document tracks the development phases of the full-stack Perplexity clone from its initial MVP to future enterprise capabilities.
**Scope**: All backend infrastructure, API design, frontend UI, state management, and external integrations.
**Current Phase**: V2 (Usability Improvements) hardening + the audit-driven **Foundation Track** below.
**Usage**: Mark capabilities as `(Completed)` when fully integrated and deployed to the `main` branch.

---

## Ultimate Objective

> **Complete Research Intelligence (V4 — Deep Research) and deliver a fully
> functional Perplexity clone.**

Every phase before V4 exists to make that feature reliable, affordable, and
safe to build. The Foundation Track (Phases 0–5) is not the goal; it is the
entry gate. Intermediate improvements must not become detours: a phase is
justified only if it protects the core ask loop that Research Intelligence
extends, removes a proven prerequisite, or preserves the engineering knowledge
needed to design V4 well.

**Guiding principles from the original design notes (notebook, 03/06/26):**
build small but with clean boundaries; evolve version by version; choose the
MVP vertical slice first; design APIs after the design is clear.

**V2 deployment boundary**: V2 is local and single-user. Authentication,
user-owned data, public rate limits, quotas, and billing limits are intentionally
out of scope until productization/deployment phases.

---

## V1 - MVP Foundation (Completed)

Core capabilities required to make the first complete product loop work.

| Area | Capability | Purpose |
|---|---|---|
| **Backend** | Database persistence | Store threads, turns, sources, and citations (via PostgreSQL) |
| **Backend** | Web search & LLM | Retrieve external sources and generate answers (Tavily, Groq) |
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
| **Backend/Frontend** | Progress and recovery | Show ask lifecycle stages, structured stream errors, and retry failed turns by appending a new turn |
| **Backend/Frontend** | Server-backed history | Load sidebar and `/history` from `GET /perplexity/threads`, with local history as an optimistic fallback |
| **Backend** | Pagination support | Load large lists such as thread history and source lists in stable chunks |
| **Backend/Frontend** | Expanded Thread Management | History/sidebar rename, delete, bulk delete, pin/unpin, and richer server-backed history controls |
| **Frontend** | Source and citation polish | Links tab source actions, cited-source emphasis, citation tooltip open/copy actions |
| **Frontend** | Share/export basics (Completed) | Copy response/thread URLs, Markdown, and plain text without public share records |

**V2 state (verified by the October 2026 repository audit):** all V2 rows are
implemented; backend 125/125 tests and frontend 57/57 tests pass; both apps
typecheck and lint clean.

### Contribution Scope: Frontend Loading, History, Sources, And Citations

Kashif's contribution for the V2 loading, skeleton, empty-state,
history-cache, lazy-source, and citation-tooltip polish was frontend-only
because this feature required no backend implementation. The work covered
React/Next.js UI components, route and panel loading states, contextual empty
states, React Query cache sharing and request deduplication, lazy source loading
for the Links tab, citation popup positioning plus hover/focus behavior,
accessibility refinements, and focused frontend tests.

Backend/API routes, database schema or persistence changes, object storage, and
deployment changes were outside this feature's scope.

---

## Foundation Track — Audit-Driven Remediation (Pre-V4 Gate)

**Source:** comprehensive repository audit reconciling the original design
notebook (IMG_1087–IMG_1094, 03/06/26), the `_docs/` documentation, and the
implementation. The complete, traceable findings inventory with stable IDs
(BUG-01, DOC-02, …) lives in [FINDINGS.md](FINDINGS.md); this section only
sequences the work.

**Sequencing logic:** hygiene first (clean, green baseline) → stream-lifecycle
robustness (touches the files hygiene just cleaned) → documentation (must
describe final behavior, so it follows code changes) → verification
infrastructure (protects everything after) → a short, decision-gated V4
readiness pass. Research Intelligence scoping begins only after this track.

### Phase 0 — Decisions (no code) — ✔ Completed 2026-10-26

- **Objective:** close open product/engineering decisions so later phases never guess.
- **Items:** ROAD-02 (caching), ARCH-01 (thread failure semantics), SEC-01 (demo posture), KNOW-04 + ROAD-03 (notebook clarifications).
- **Serves the goal:** caching and guardrail decisions directly shape V4 economics — deep research multiplies Tavily + Groq spend, so cost posture must be decided before designing it.
- **Outcomes (recorded in [FINDINGS.md](FINDINGS.md) Decision Register):**
  1. **Answer-level caching rejected** — freshness contradicts the realtime differentiator, and follow-up rewrites make exact-match hit rates ≈ 0. Revisit trigger recorded for V4: *search-result-level* caching (short TTL, keyed by the rewritten `searchQuery`) if research loops show query overlap.
  2. **Thread failure semantics kept** — thread status = latest-activity state; self-heals on retry; the per-turn failed card is the real user surface. Rationale documented in Phase 3.
  3. **Demo posture: app-level demo-gate auth + rate limiting** before the LinkedIn launch (revised same day from platform-only protection): a single env-configured access credential → `/login` → signed HttpOnly session cookie, a global guard on `/perplexity/*`, and `@nestjs/throttler` rate limits (strict on `/ask*`). Explicitly **not** user accounts — threads stay single-tenant; full multi-user auth remains V5. Backend's direct public exposure verified in Phase 4.
  4. **Credit-based usage clarified** — an intention, never built; consciously deferred (covered by V5 Billing/Limits).
- **Exit:** every Decision Register row carries a recorded outcome. ✔ Met.

### Phase 1 — Correctness & hygiene

- **Objective:** fix the one confirmed logic defect, close the config hole, remove verified dead code, and correct the one inaccurate doc — all small, independent, test-covered.
- **Items:** BUG-01 (error-body fallback), SEC-04 (`.env.*` gitignore), DEBT-01 (dead code), DEBT-05 (eslint/tsconfig hygiene), DOC-01 (architecture order inversion; unblocks KNOW-03).
- **Serves the goal:** V4 branches off this codebase; the baseline must be trustworthy and the knowledge base accurate before public write-ups and new feature work.
- **Acceptance:** backend 125 + frontend 57 tests green; `tsc --noEmit` and ESLint clean in both apps; grep confirms removed symbols have zero references; ARCHITECTURE.md order matches `ask.service.ts`.

### Phase 2 — Stream lifecycle & UX edges

- **Objective:** make the single-ask stream bulletproof and finish small UX gaps.
- **Items:** BUG-02 (terminal-state handling via `onDone` + wire the `signal` abort param), BUG-03 (test-first investigation), ARCH-04 (unify ask orchestration), ARCH-05 (de-hardcode `mode: 'web'` seeds), FEAT-04 (mobile thread actions), FEAT-05 (turn-URL copy), DEBT-02 (sources shape), DEBT-04 (search debounce); BUG-04 only if trivial, else Phase 5.
- **Serves the goal:** Research Intelligence will be long-running, multi-step streamed workflows; the single-ask stream lifecycle is its foundation and must be rock-solid first.
- **Acceptance:** new unit tests for terminal-stream handling (and the BUG-03 fix, if reproduced); manual smoke of ask/follow-up/retry/delete; existing suites stay green.
- **Risk note:** `useAskSubmit` is intricate and currently untested (TEST-03) — one jsdom safety-net test may be pulled forward into this phase.

### Phase 3 — Documentation & knowledge base

- **Objective:** preserve the original engineering thinking and reconcile every doc with the post-Phase-2 behavior.
- **Items:** DOC-11/KNOW-01 (new design-decisions/journal doc holding DOC-02, DOC-03, DOC-04, DOC-05, DOC-08), DOC-06, DOC-07, DOC-09, DOC-10.
- **Serves the goal:** accurate docs are the design surface for V4 — and the notebook's original reasoning (preserved, not rewritten) is the material for the public engineering write-ups.
- **Why third:** writing docs before Phases 1–2 settle guarantees rework.
- **Acceptance:** every notebook page maps to a documented decision or an explicitly recorded change; the DOC-01 correction is live.

### Phase 4 — Verification & reliability

- **Objective:** build the regression net and dynamically verify what the audit could only verify statically.
- **Items:** TEST-03 (jsdom + hook/mutation tests), TEST-01 (HTTP-level controller + filter/interceptor tests), TEST-02 (minimal real-Postgres repository suite), TEST-04 (minimal CI: lint + typecheck + both suites), TEST-05 / INFRA-01 / INFRA-02 (docker build, full local e2e walkthrough per DEPLOYMENT.md §5, live SSE check) — satisfies KNOW-02.
- **Serves the goal:** Research Intelligence is the most complex feature on the roadmap; CI plus integration tests are what make it safe to build fast without regressing the core loop.
- **Acceptance:** CI green on a PR; the manual e2e checklist executed once end-to-end.

### Phase 5 — V4 readiness gate & demo hardening

- **Objective:** close the remaining hardening items and make the deployed demo safe to publish — the LinkedIn launch gate.
- **Items:** SEC-05 (demo-gate auth: env-configured credential → `/login` → signed HttpOnly session cookie; global guard on `/perplexity/*`), SEC-06 (rate limiting via `@nestjs/throttler`, strict on `/ask*`), SEC-02 (favicon proxy or accept), SEC-03 (CSP header), ARCH-03 (bound/paginate thread detail), ARCH-02 (document or enforce), BUG-04 (if deferred from Phase 2). *(Phase-0 outcomes removed FEAT-01 — answer caching rejected. SEC-01 was revised same-day from platform-only protection to app-level demo-gate auth + rate limiting.)*
- **Serves the goal:** clears the ROAD-01 prerequisite list and makes the demo publishable **without** pulling full V5 user accounts forward and delaying V4.
- **Exit gate to V4:** every ROAD-01 prerequisite is either resolved or consciously deferred with a recorded reason; the demo is publishable (auth gate + rate limits live; backend exposure verified in Phase 4).

---

## V3 - Deployment Readiness

Operational work needed before the application is easier to run outside local development.

| Area | Capability | Purpose |
|---|---|---|
| **Backend** | Dockerized deployment (Completed) | Package the backend and dependencies consistently — multi-stage non-root Dockerfiles, one-shot migration target, and the `compose.yaml` stack are on `main` (verified by the October 2026 audit, ROAD-04) |
| **Backend** | Public deployment guardrails | Add rate limits, secure configuration validation, and operational checks before exposing the API publicly — partially addressed by Foundation Track Phases 0/5 (SEC-01) |

## V4 - Research Intelligence — **the ultimate objective**

Higher-level reasoning features after the basic ask/search/answer loop is reliable.

| Area | Capability | Purpose |
|---|---|---|
| **Backend** | Deep Research agents | Run multi-step research workflows instead of a single search pass |

**Entry gate:** detailed V4 scoping begins only after the Foundation Track exit
criteria are met (ROAD-01 prerequisites resolved or consciously deferred).
Existing groundwork: the `mode` field on threads, the `deep-research` filter
stub (`threads.service.ts` returns an empty list today, documented in API.md),
and the streaming/persistence pipeline it will build on. This connects back to
the original notebook note "Deep research (most important)" (IMG_1092).

## V5 - Productization

Features needed when the product moves beyond a single-user V1 app.

| Area | Capability | Purpose |
|---|---|---|
| **Backend/Frontend** | Authentication | User login, sign-up flows — full multi-user auth (a single-credential demo gate ships earlier in Phase 5 as SEC-05; this row remains the real thing) |
| **Backend/Frontend** | User-scoped Persistence | Ensure all threads, turns, sources, and citations are owned by a user |
| **Backend** | Billing / Limits | Control cost, rate limits, and paid usage |

## V6 - Architecture Scaling

Only needed when the modular monolith becomes a proven bottleneck.

| Area | Capability | Purpose |
|---|---|---|
| **Backend** | Microservices | Split specific capabilities into separate services |
