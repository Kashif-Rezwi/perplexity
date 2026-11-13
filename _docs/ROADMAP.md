# Product Roadmap

[Docs](README.md)

**Purpose**: This document tracks the development phases of the full-stack Perplexity clone from its initial MVP to future enterprise capabilities.
**Scope**: All backend infrastructure, API design, frontend UI, state management, and external integrations.
**Current Phase**: V2 hardening and the **Foundation Track**. Phases 0–2 have recorded implementation checkpoints; Phase 3 documentation completed on 12 November 2026. Phase 4 verification and reliability is next.
**Status convention**: Implemented means code exists in the reviewed checkout. Partial means only the stated subset exists. Planned means implementation is absent.
Recorded phase checkpoints are historical. A successful build, browser workflow, or live release needs separate evidence; none is implied by a code status.

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

## V1 - MVP Foundation (Implemented)

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

This is a runtime checklist. It was not executed during the documentation cross-check.

- Submit a new ask and confirm navigation to `/thread/:threadId`.
- Ask a follow-up and confirm the same thread receives a new turn.
- Click a citation and confirm the Links tab opens and highlights the matching source.
- Open the Links tab and confirm sources load from `GET /perplexity/sources?turnId=...`.
- Delete a thread and confirm the sidebar/cache history updates.
- Open `/history`, select a thread, and confirm the conversation loads.

## V2 - Usability Improvements (Core implemented; sharing partial)

Enhancements that improve the client experience once the core flow is stable.

| Area | Capability | Purpose |
|---|---|---|
| **Backend/Frontend** | Streaming responses (Implemented) | Return and render answer text progressively via SSE |
| **Backend/Frontend** | Progress and recovery (Implemented) | Lifecycle stages, structured errors, and appended retry attempts; lifecycle limits remain in ARCH-02/ARCH-06 |
| **Backend/Frontend** | Server-backed history (Implemented) | Server summaries with local optimistic/fallback history |
| **Backend** | List pagination (Implemented) | Cursor pages for history and sources; thread detail remains unbounded and BUG-04 remains open |
| **Backend/Frontend** | Thread management (Implemented) | Rename, delete, bulk delete, and pin/unpin |
| **Frontend** | Source and citation controls (Implemented) | Links actions, cited-source emphasis, and citation tooltip actions |
| **Frontend** | Share/export (Partial) | URL, Markdown, and plain-text copy work. Public sharing, access-scoped records, and file downloads are absent |

**Current verification, 12 November 2026:** backend 127/127 tests and frontend 71/71 tests across 18 files pass.
Both applications pass TypeScript and ESLint checks. These checks do not verify a live deployment or complete browser workflows.
The sidebar groups pins from its first history page. The Links hook consumes the first source page per turn.
Deep Research, authentication, rate limits, and billing are not implemented.

The specific frontend contribution account is preserved in
[Design history](DESIGN_HISTORY.md#contribution-scope-frontend-loading-history-sources-and-citations).

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
  1. **Answer-level caching rejected** — the recorded rationale prioritizes freshness and expects low reuse for contextual questions. This is a decision, not a measured cache-hit result. Revisit search-result caching in V4 if research loops show actual query overlap.
  2. **Thread failure semantics kept** — thread status = latest-activity state; self-heals on retry; the per-turn failed card is the real user surface. Rationale documented in Phase 3.
  3. **Demo posture: app-level demo-gate auth + rate limiting** before the LinkedIn launch: a single env-configured credential, `/login`, signed HttpOnly session cookie, global `/perplexity/*` guard, and strict ask limits. These are planned Phase-5 controls; full multi-user auth remains V5. Backend-exposure verification is still Phase-4 work.
  4. **Credit-based usage clarified** — an intention, never built; consciously deferred (covered by V5 Billing/Limits).
- **Exit:** every Decision Register row carries a recorded outcome. ✔ Met.

### Phase 1 — Correctness & hygiene ✔ Completed 2026-10-27

- **Objective:** fix the one confirmed logic defect, close the config hole, remove verified dead code, and correct the one inaccurate doc — all small, independent, test-covered.
- **Items:** BUG-01 (error-body fallback), SEC-04 (`.env.*` gitignore), DEBT-01 (dead code), DEBT-05 (eslint/tsconfig hygiene), DOC-01 (architecture order inversion; unblocks KNOW-03).
- **Serves the goal:** V4 branches off this codebase; the baseline must be trustworthy and the knowledge base accurate before public write-ups and new feature work.
- **Acceptance:** backend 125 + frontend 62 tests green; `tsc --noEmit` and ESLint clean in both apps; grep confirms removed symbols have zero references; ARCHITECTURE.md order matches `ask.service.ts`.
- **Outcomes:**
  - Added `readErrorMessage` helper in `frontend/src/lib/api/client.ts` (handles JSON `message`, class-validator `message[]`, raw text, and statusText fallback) and covered it with `client.test.ts`.
  - Deleted dead frontend code: `postAsk`, `getPinnedThreads`, `PinnedThreadListQueryInput`, unused query keys, unused props/attributes, and un-needed exports.
  - Hardened `.gitignore` against `.env.*` variants.
  - Enabled `noUnusedLocals`/`noUnusedParameters` in both tsconfigs and ESLint unused-vars as error; removed stale `jest` globals from backend eslint.
  - Recorded an ask-flow documentation correction. The complete diagram/prose order was rechecked and corrected on 2026-11-12 under DOC-01.

### Phase 2 — Stream lifecycle & UX edges ✔ Completed 2026-10-27

- **Objective:** improve the single-ask stream lifecycle and finish small UX gaps.
- **Items:** BUG-02 (terminal-state handling + wire the `signal` abort param), BUG-03 (test-first investigation), ARCH-04 (unify ask orchestration), ARCH-05 (de-hardcode `mode: 'web'` seeds), FEAT-04 (mobile thread actions), FEAT-05 (turn-URL copy), DEBT-02 (sources shape), DEBT-04 (search debounce); BUG-04 deferred to Phase 5.
- **Serves the goal:** Research Intelligence will be long-running, multi-step streamed workflows; the single-ask stream lifecycle is its foundation and must be rock-solid first.
- **Acceptance:** new unit tests for terminal-stream handling (and the BUG-03 fix, if reproduced); manual smoke of ask/follow-up/retry/delete; existing suites stay green.
- **Current coverage:** Phase 2 added three `useAskSubmit` tests with Testing Library and `happy-dom`. Broader mutation, route-transition, and workflow coverage remains TEST-03.
- **Outcomes:**
  - BUG-02: terminal-event check, removal of `onDone`, browser cancellation, and backend cleanup that reads status before failure. Atomic cleanup and process-stop recovery are not guaranteed; see ARCH-02/ARCH-06.
  - BUG-03: reproduction test added first, then `link` nodes skipped by `remarkCitations`.
  - ARCH-04: single `useAskSubmit` per page (`useThreadPage` owns the thread instance; `AskInput` is presentational; `HomeAskInput` owns the home instance).
  - ARCH-05: backend `start` event carries `mode`; frontend seeds use `event.mode`.
  - FEAT-04/FEAT-05: mobile thread-action menu visible at all breakpoints; "Copy link to this turn" wired via `createTurnUrl`.
  - DEBT-02/DEBT-03/DEBT-04: `/sources` contract aligned (`provider`/`providerScore`); history store `version: 1`; 300ms history-search debounce.
  - Added dev-only `@testing-library/react` + `happy-dom` and a `useAskSubmit` safety net.
  - Baseline: backend 127/127 tests, frontend 71/71 tests, tsc + ESLint clean both apps.

### Phase 3 — Documentation & knowledge base ✔ Completed 2026-11-12

- **Objective:** preserve the original engineering thinking and reconcile every doc with the post-Phase-2 behavior.
- **Items:** DOC-11/KNOW-01 (new design-decisions/journal doc holding DOC-02, DOC-03, DOC-04, DOC-05, DOC-08), DOC-06, DOC-07, DOC-09, DOC-10.
- **Serves the goal:** accurate docs are the design surface for V4 — and the notebook's original reasoning (preserved, not rewritten) is the material for the public engineering write-ups.
- **Why third:** these docs describe the post-Phase-2 implementation.
- **Acceptance:** every notebook page maps to a documented decision or an explicitly recorded change; the DOC-01 correction is live.
- **Outcomes, 12 November 2026:** the Docs index and cross-file claim review are
  complete; DOC-01/06/09/10/12 are corrected. [Design history](DESIGN_HISTORY.md)
  accounts for all eight reviewed notebook pages, original users/comparison
  observations, later caching/feature decisions, the ask-first lesson, corrected
  naming evolution, technical trade-offs, and frontend contribution attribution.
  Uncertain writing and the limits of the historical comparison remain explicit.
- **Execution and acceptance:** the [six-task execution record](PHASE_3_PLAN.md)
  links the original page accounts, rewritten notes/diagrams, source record, and final checks.
  Every page has a decision/current-behavior/change mapping; DOC-01 remains live.
  The [final source-to-image review](PHASE_3_PLAN.md#final-review--13-november-2026)
  on 13 November confirmed completion after minor fidelity corrections.
  This documentation checkpoint does not close Phase-4 runtime verification or
  Phase-5 hardening work.

### Phase 4 — Verification & reliability

- **Objective:** build the regression net and dynamically verify what the audit could only verify statically.
- **Items:** TEST-03 (extend existing `happy-dom` hook tests with mutations and route workflows), TEST-01 (HTTP controller, filter, and interceptor tests), TEST-02 (real-Postgres repository suite), TEST-04 (CI for lint, types, and both suites), TEST-05 / INFRA-01 / INFRA-02 (container builds, full local walkthrough, and deployed SSE verification). These runtime checks remain open.
- **Serves the goal:** Research Intelligence is the most complex feature on the roadmap; CI plus integration tests are what make it safe to build fast without regressing the core loop.
- **Acceptance:** CI green on a PR; the manual e2e checklist executed once end-to-end.

### Phase 5 — V4 readiness gate & demo hardening

- **Objective:** close the remaining hardening items and make the deployed demo safe to publish — the LinkedIn launch gate.
- **Items:** SEC-05 (demo access gate), SEC-06 (application rate limits), SEC-02 (favicon proxy or recorded acceptance), SEC-03 (CSP), ARCH-03 (bounded thread detail), ARCH-02 (concurrency policy; limits are now documented), ARCH-06 (cancellation/recovery policy), and BUG-04 (pagination investigation). Answer caching remains rejected under the Phase-0 decision.
- **Serves the goal:** clears the ROAD-01 prerequisite list and makes the demo publishable **without** pulling full V5 user accounts forward and delaying V4.
- **Exit gate to V4:** every ROAD-01 prerequisite is either resolved or consciously deferred with a recorded reason; the demo is publishable (auth gate + rate limits live; backend exposure verified in Phase 4).

---

## V3 - Deployment Readiness

Operational work needed before the application is easier to run outside local development.

| Area | Capability | Purpose |
|---|---|---|
| **Backend/Frontend** | Docker/Compose artifacts (Implemented; runtime unverified) | Both Dockerfiles, migration target, health checks, and Compose exist. Build and rollout verification remain INFRA-01/02 |
| **Backend/Frontend** | Public deployment controls (Partial) | Environment validation, response headers, explicit-origin CORS, and health routes exist. Demo authentication and rate limits remain planned Phase-5 work |

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
