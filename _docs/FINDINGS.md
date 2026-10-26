# Engineering Findings Inventory

**Purpose:** Complete, traceable inventory of every finding from the
comprehensive repository audit, used to drive the Foundation Track phases in
[ROADMAP.md](ROADMAP.md). This file is the tracker: update dispositions and
statuses here as decisions are made and work completes.

**Source of truth:** Repository audit + reconciliation against the original
design notebook (photos IMG_1087–IMG_1094, dated 03/06/26). Verification
performed during the audit: backend 125/125 tests, frontend 57/57 tests,
`tsc --noEmit` and ESLint clean in both apps.

---

## How to read and maintain this file

**State legend**

| Mark | Meaning |
|---|---|
| ✅ Confirmed | Verified directly in code, config, or a passing test run |
| ◐ Partial | Strong static evidence; runtime behavior inferred, not exercised |
| ❓ Unverified | Needs investigation or a reproduction before action |
| 💡 Intentional | Deliberate current state (documented deferral or trade-off) |
| ✔ Resolved | Fixed already, with evidence |

**Priority legend**

| Mark | Meaning |
|---|---|
| P0 | Must-fix: correctness/safety, cheap, no design ambiguity |
| P1 | Important: fix before or during the Foundation Track |
| P2 | Optional improvement: proportional, not a blocker |
| P3 | Future product work (V4+ scope) |

**Maintenance rules**

1. Finding IDs are stable. Never reuse or renumber an ID; mark it ✔ Resolved
   or note its disposition instead.
2. When a Phase-0 decision is made, record the outcome in the finding's
   Decision status and in the Decision Register below.
3. When work completes, mark the finding ✔ Resolved with the evidence
   (commit, test, or doc reference).
4. Add new findings at the end of their category with the next free ID.

---

## Decision Register

All Phase-0 items were decided on 2026-10-26. New decisions get appended here
with their date, outcome, and rationale.

| # | Question | Findings | Decision (2026-10-26) | Status |
|---|---|---|---|---|
| 1 | **Response caching**: notebook listed it three times; code and docs dropped it. Implement, roadmap, or deliberately reject? | ROAD-02 / DOC-02 / FEAT-01 | **Rejected for answer-level caching** — freshness contradicts the realtime differentiator (notebook IMG_1088), and follow-up query rewrites make exact-match hit rates ≈ 0 at single-user scale. **V4 revisit trigger recorded:** re-evaluate *search-result-level* caching (short TTL keyed by the rewritten `searchQuery`) if multi-step research loops show real query overlap | ✅ Decided |
| 2 | **Thread failure semantics**: latest-turn failure currently marks the whole thread FAILED even with earlier completed turns. Keep or recompute? | ARCH-01 | **Keep + document** — thread status = latest-activity state; test-verified; self-heals to COMPLETED on retry success; thread-level status is barely rendered (the per-turn failed card is the real user surface). Rationale to be documented in Phase 3 | ✅ Decided |
| 3 | **Public demo posture**: no auth/rate limits on paid-API endpoints; Vercel demo is live. Accept / add an edge gate / take private? | SEC-01 | **Revised same day:** app-level **demo-gate auth + rate limiting** before the LinkedIn launch — a single env-configured access credential (no user accounts; threads stay single-tenant), `/login` page → signed HttpOnly session cookie, global guard on `/perplexity/*`, plus `@nestjs/throttler` limits (strict on `/ask*`, lenient on reads). Platform-level protection remains an optional extra. Backend's direct public exposure verified in Phase 4. New work items: SEC-05, SEC-06 (Phase 5) | ✅ Decided (revised) |
| 4 | **Notebook clarifications**: (a) IMG_1090 `list_recent` response fields (`context_id`? `link`?); (b) IMG_1092 "credit based usage" checkbox — done or decided? (c) is caching still intent? | KNOW-04 / ROAD-03 | **Answered** — "credit based usage" was an intended feature, never built; consciously deferred as not necessary now (remains covered by V5 Billing/Limits; no new work). (a) stays a best-effort reading `{context_id?, link?, status, title}` — the Phase-3 journal marks it partially legible. (c) resolved by Register #1 | ✅ Answered |

---

## 1. Documentation Gaps & Inconsistencies

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| DOC-01 | ARCHITECTURE.md sequence + text invert the real order — code rewrites the query **before** persisting the pending turn (`ask.service.ts:105-136` vs `_docs/ARCHITECTURE.md:100-104,130-133`). Matters: the turn row stores the rewritten `searchQuery` at creation | ✔ | P0 | Fixed in Phase 1 (2026-10-27): reordered steps 5/6 in `ARCHITECTURE.md` to match `preparePendingAsk`; noted pending-turn persistence and stored `searchQuery` |
| DOC-02 | Notebook caching thread (IMG_1091 "Caching"/"check for caching"/"cache the response"; IMG_1092 "caching response for similar query") absent from all docs — silently dropped | ✅ | P1 | Record decision outcome in Phase 3 (gated on Register #1) |
| DOC-03 | Notebook lesson "built APIs in wrong order (sources→threads→ask); ask should be first" (IMG_1094) captured nowhere | ✅ | P1 | Capture in Phase 3 |
| DOC-04 | Target-user persona + 3-way competitive test (IMG_1088/1089) — the *why* behind sources tab, follow-ups, clean UX — undocumented | ✅ | P1 | Capture in Phase 3 |
| DOC-05 | Endpoint naming evolution unrecorded: `perplexity-ask`→`POST /ask`, `list_recent`→`GET /threads` + `GET /sources`, `query_str`→`question` | ✅ | P2 | Optional note in Phase 3 |
| DOC-06 | ARCHITECTURE.md omits two real design decisions: citation-marker normalization safety net; 3-turn (rewrite) vs 5-turn (answer) context split | ✅ | P2 | Add in Phase 3 |
| DOC-07 | ROADMAP.md "Contribution Scope" paragraph (lines 51-62) is a personal attribution note misplaced in a phase-tracking doc | ✅ | P2 | Move to journal doc in Phase 3 |
| DOC-08 | Trade-offs unrecorded: SSE-over-POST, raw-SQL rename (`@updatedAt` bypass), Groq consolidation, `fullStream` error handling | ✅ | P2 | Capture in Phase 3 |
| DOC-09 | API.md could add: error envelope shape; "HTTP stays 200 once streaming starts; failures arrive as in-stream error events" | ✅ | P2 | Add in Phase 3 |
| DOC-10 | Minor: "PostgreSQL 17 (Neon)" vs "e.g., Neon" wording divergence; README live-demo claim is external/unverifiable from repo | ✅/💡 | P2 | Minor wording in Phase 3 |
| DOC-11 | Proposal (not a defect): a design-decisions/journal doc as the durable home for DOC-02/03/04/05/08 — preserves original thinking for public write-ups | 💡 | P1 | Create in Phase 3 |

## 2. Bugs & Functional Issues

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| BUG-01 | Error-body fallback reads an already-consumed body: when `response.json()` throws, the catch reads `response.text()` → "Body is unusable" (`client.ts:52-60`, `index.ts:148-158`). Masked today because the backend always returns JSON errors; bites on non-JSON upstream errors with a misleading `NetworkError` | ✔ | P0 | Fixed in Phase 1 (2026-10-27): shared `readErrorMessage` helper in `client.ts`, used by `apiClient` and `streamAskRequest`; review pass also hardened it against NestJS class-validator `message: string[]` bodies; covered by `client.test.ts` (5 tests) |
| BUG-02 | SSE stream ending with neither `final` nor `error` (network truncation) leaves the turn spinning as pending forever — no watchdog; the `onDone` hook exists but is unconsumed | ✔ | P1 | Fixed in Phase 2 (2026-10-27): transport-level terminal watchdog throws `NetworkError` when the stream closes without `final`/`error` (the unused `onDone` hook was removed); `AbortController` wired through `useAskSubmit` with unmount cleanup; backend `createAskStream` gained a `finally` guard that re-checks the persisted turn status and only fails it if still PENDING, so an abandoned generator can neither strand a PENDING turn nor overwrite a completed one |
| BUG-03 | `remarkCitations` doesn't skip existing mdast `link` nodes — `[1]` inside Markdown link text could produce nested `<a>` | ✔ | P1 | Fixed in Phase 2 (2026-10-27): reproduction test added first (failed), then `link` nodes were skipped alongside `code`/`inlineCode` |
| BUG-04 | Cursor pagination edge cases: `skip: 1` against a deleted cursor row silently drops a row; mutable `updatedAt` sort key drifts between pages | ◐ | P2 | Deferred to Phase 5 (non-trivial keyset redesign; not a quick-wins item) |

## 3. Feature Gaps & Incomplete Implementations

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| FEAT-01 | Response caching (notebook feature) not implemented anywhere | ✅ | — | ✔ Resolved by decision (Register #1): answer caching rejected; V4 revisit trigger for search-result-level caching recorded. No implementation |
| FEAT-02 | Deep-research groundwork only: DTO accepts `mode=deep-research`, service returns an empty list (`threads.service.ts:45-47`); `ThreadMode` = WEB only; frontend filter option exists. Documented stub (API.md:242-246) | ✅/💡 | P3 | Keep as stub; V4 scope |
| FEAT-03 | Intentional placeholders: "Sign in" button (no handler), "Share" button (disabled "coming soon"), AskInput "Search" mode pill (decorative) | 💡 | — | Accepted deferrals (V5 auth; share deferred) |
| FEAT-04 | Thread actions menu (rename/delete/export) is `hidden sm:block` — unavailable on mobile | ✔ | P2 | Fixed in Phase 2 (2026-10-27): menu is now visible at all breakpoints |
| FEAT-05 | Turn-URL copy (`#turn-` deep links) not wired — `createTurnUrl` exists and auto-scroll supports the hash, but no UI copies it | ✔ | P2 | Fixed in Phase 2 (2026-10-27): "Copy link to this turn" action added to `TurnResponseActions` using `createTurnUrl` |

## 4. Architecture & Design Issues

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| ARCH-01 | `failTurn` on the latest turn marks the whole thread FAILED even with earlier completed turns — history shows "failed" on a mostly-good thread | ✅ (test-verified semantic choice) | — | ✔ Resolved by decision (Register #2): keep latest-activity semantics; rationale to be documented in Phase 3 |
| ARCH-02 | No single-pending-turn invariant; latest-turn guard is check-then-act at READ COMMITTED. Unreachable from the current UI (submit disabled while pending) | ◐ | P2 | Document in Phase 3; enforce pre-V4 only if needed |
| ARCH-03 | `GET /threads/:id` returns all turns+sources+citations unbounded — fine at V2 scale; V4 deep research will stress it | ✅ | P2 | Phase 5 (bound or paginate turns) |
| ARCH-04 | Two `useAskSubmit` instances on the thread page (page-level retry + AskInput) — works, but duplicative orchestration | ✔ | P2 | Fixed in Phase 2 (2026-10-27): one `useAskSubmit` instance lives in `useThreadPage`; `AskInput` is now presentational (home page owns its instance via `HomeAskInput`). One `isPending` now gates both submit and retry, closing the concurrent-stream hole |
| ARCH-05 | Frontend seeds hardcode `mode: 'web'` (`useAskSubmit.ts:81-96`, `askCache.ts:37-56`) — forward-compat debt for FEAT-02 | ✔ | P2 | Fixed in Phase 2 (2026-10-27): backend `start` event now carries `mode` (mapped through `THREAD_MODE_MAP`); frontend seeds use `event.mode` |

## 5. Code Quality & Technical Debt

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| DEBT-01 | Dead-code cluster (grep-verified zero call sites): `postAsk`, `getPinnedThreads`, `queryKeys.{threadsPinned,threadsSidebar,sourcesRoot}`, `createTurnUrl` (→FEAT-05), `onDone` hook (→BUG-02), never-passed `signal` param (→BUG-02), unused `threadId/turnId` props on `TurnResponseActions`, unused `data-text-tab` attr; plus same-file-only exports `createStreamingTurn` and `findCitationSourceIndexByKey` (drop the unneeded `export`) | ✔ | P0 | Deleted in Phase 1 (2026-10-27): removed `postAsk`, `getPinnedThreads`, `PinnedThreadListQueryInput`, `queryKeys.{threadsPinned,threadsSidebar,sourcesRoot}`, `TurnResponseActions` `threadId/turnId` props, `data-text-tab`; un-exported `createStreamingTurn` + `findCitationSourceIndexByKey`. `createTurnUrl`, `onDone`, and the unused `signal` param remain coupled to Phase 2 decisions |
| DEBT-02 | API shape inconsistency: sources-list items omit `provider`/`providerScore`; thread-detail embedded sources include them | ✔ | P2 | Fixed in Phase 2 (2026-10-27): `provider`/`providerScore` added to the `/sources` contract (backend `SourceItem` + `mapSource`, frontend `SourceListItem`); API.md updated |
| DEBT-03 | `historyStore` persisted to localStorage with no `version`/`migrate` — future shape changes will strand old data | ✔ | P2 | Fixed in Phase 2 (2026-10-27): `version: 1` added with a comment; no `migrate` yet because the shape has not changed since introduction |
| DEBT-04 | History search not debounced — one server query per keystroke | ✔ | P2 | Fixed in Phase 2 (2026-10-27): `useDebouncedValue` (300ms) feeds the server query while the input and empty-state copy stay immediate |
| DEBT-05 | Backend eslint configures `jest` globals though the runner is `node:test`; `strictPropertyInitialization: false` in tsconfig; **enable `noUnusedLocals` + `noUnusedParameters` (and ESLint unused-vars enforcement) in both apps so unused locals/params fail checks going forward** (approved 2026-10-26) | ✔ | P2 | Completed in Phase 1 (2026-10-27): removed stale `jest` globals from backend eslint; enabled `noUnusedLocals` + `noUnusedParameters` in both tsconfigs; set `@typescript-eslint/no-unused-vars` to `error` in both eslint configs |
| DEBT-06 | Markdown-stripping duplicated across layers (backend `ask-text.util.ts` vs frontend `threadExport.markdownToPlainText`) — different purposes; acceptable | ✅ | — | Accepted; no refactor |
| DEBT-07 | Sources inserted sequentially inside `completeTurn` (bounded ≤ `TAVILY_MAX_RESULTS`=5) | ✅ | — | Accepted; batch only if limits grow |

## 6. Testing & Reliability Gaps

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| TEST-01 | No HTTP-level/e2e tests: controllers only route-smoke-tested; exception filter, logging interceptor, SSE abort wiring, CORS/bootstrap untested | ✅ | P1 | Phase 4 |
| TEST-02 | No real-DB tests — raw SQL regex-matched only; transaction semantics fully mocked | ✅ | P1 | Phase 4 (minimal dockerized-Postgres suite for repositories) |
| TEST-03 | Frontend Vitest runs in node env, no jsdom/testing-library: `useAskSubmit` orchestration, mutations, and all interactive components untested | ✅ | P1 | Phase 4; one `useAskSubmit` safety-net test may join Phase 2 |
| TEST-04 | No CI pipeline (README states this honestly) | ✅ | P1 | Phase 4 (lint + typecheck + both suites) |
| TEST-05 | Unverified externals: live Tavily payload shape (`publishedDate`), real Groq stream behavior, Docker image builds, Vercel SSE behavior | ❓ | P1 | Phase 4 verification tasks (KNOW-02) |

## 7. Security & Configuration Concerns

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| SEC-01 | No auth/authz/user-scoping/rate limits on money-spending endpoints; public Vercel demo live. Documented, intentional V2 boundary (README:11-15, DEPLOYMENT.md §1) — real risk if the link circulates | ✅ | — | ✔ Decided (Register #3, revised): app-level demo-gate auth (SEC-05) + rate limiting (SEC-06) in Phase 5 before the LinkedIn launch; backend-exposure verification in Phase 4; DEPLOYMENT.md posture note in Phase 3 |
| SEC-02 | Source favicons fetched from Google's `/s2/favicons` — every source domain leaks to a third party (flagged in frontend/README.md:37-39) | ✅ | P2 | Phase 5 (first-party proxy/cache or accept) |
| SEC-03 | No CSP header (defense-in-depth; XSS surface already low — no `rehype-raw`, URL sanitization on) | ✅ | P2 | Phase 5 |
| SEC-04 | Root `.gitignore` covers only `.env`/`.env.local` — `.env.production` etc. are committable | ✔ | P0 | Fixed in Phase 1 (2026-10-27): `.gitignore` now ignores `.env.*` except `.env.example` |
| SEC-05 | Demo-gate authentication (Register #3, revised 2026-10-26): single env-configured access credential; `/login` → signed HttpOnly session cookie; global guard on `/perplexity/*`. Explicitly NOT user accounts — threads stay single-tenant; full multi-user auth remains V5 | ✅ (decision) | P1 | Implement in Phase 5 (LinkedIn launch gate) |
| SEC-06 | Rate limiting before public launch: `@nestjs/throttler` — strict limits on money-spending endpoints (`POST /perplexity/ask*`), lenient global/read limits; gateway-level limits still recommended per DEPLOYMENT.md | ✅ (decision) | P1 | Implement in Phase 5 (with SEC-05) |

## 8. Performance & Scalability

No standalone performance defects at V2 scale. Items with performance
character are tracked at their primary IDs and cross-referenced here:
ARCH-03 (unbounded payload), DEBT-04 (keystroke queries), DEBT-07
(sequential inserts). Caching — the only real cost/latency lever, since every
ask spends Tavily + Groq quota — was considered and rejected at Phase 0
(Register #1). No separate findings needed.

## 9. Infrastructure, Integration & Deployment

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| INFRA-01 | Docker images not build-verified during the audit (`docker compose build` never ran; builder-stage placeholder `DATABASE_URL` is documented and safe) | ❓ | P1 | Phase 4 verification |
| INFRA-02 | Vercel deployment: whether the SSE proxy guidance in DEPLOYMENT.md §7 is honored by the live deployment is unverifiable from the repo | ❓ | P1 | Phase 4 verification |
| INFRA-03 | `DELETE /perplexity/threads` carries a JSON body — some proxies/clients strip DELETE bodies (works in the fetch-based client) | ✅/💡 | — | Accepted; revisit only if a client breaks |
| INFRA-04 | PrismaClient: no pool tuning, no startup retry (compose `depends_on` covers ordering), no query logging | 💡 | — | Accepted for V2 |

## 10. Feature & Product Roadmap Gaps

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| ROAD-01 | Research Intelligence (V4) prerequisites hiding in current findings: ARCH-03 (payload bounds), FEAT-02/ARCH-05 (mode plumbing); cost posture settled in Phase 0 (caching rejected — Register #1; demo protection — Register #3) | ✅ | P3 | Phase 5 exit gate; RI scoping after |
| ROAD-02 | Caching decision (notebook listed it; docs/code dropped it) — tracked here as the *decision*; duplicates DOC-02/FEAT-01 intentionally | ✅ | — | ✔ Resolved — Register #1 (rejected for answers; V4 search-level revisit trigger recorded) |
| ROAD-03 | Notebook IMG_1092 "credit based usage" checkbox — clarified by the author: an intended feature, never built; consciously deferred as not necessary now | ✔ | — | Resolved — remains covered by V5 Billing/Limits; no new work |
| ROAD-04 | ROADMAP checkboxes vs reality: V3 "Dockerized deployment" was delivered (verified: multi-stage non-root Dockerfiles + compose on `main`) but unmarked | ✅ | P2 | ✔ Resolved — marked in ROADMAP.md during this documentation update |

## 11. Engineering Process & Knowledge Gaps

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| KNOW-01 | Original thinking preservation: notebook decisions (caching, API-ordering lesson, persona, competitive analysis, naming evolution) need a durable home → DOC-11 | ✅ | P1 | Phase 3 |
| KNOW-02 | Public write-ups should follow dynamic verification (TEST-05) — don't publish flow claims you haven't watched run | 💡 | P1 | Phase 4 |
| KNOW-03 | Fix DOC-01 before writing public posts, or the inverted order gets published | ✔ | P1 | Phase 1 fixed (2026-10-27) → Phase 3 docs pass |
| KNOW-04 | Notebook ambiguities — answered by the author (Register #4): credit-usage intent clarified; IMG_1090 `list_recent` fields remain a best-effort reading `{context_id?, link?, status, title}` for the Phase-3 journal | ✔ | — | Resolved (Register #4) |

## 12. Other

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| MISC-01 | Branding: inline Perplexity logomark (`icons.tsx`) + lowercase "perplexity" home title — trademark/attribution consideration before public posts/demo sharing | 💡 | — | Advisory; remember when publishing |
| MISC-02 | Historical: `Thread.status` defaulted to `COMPLETED` in the init migration — fixed by migration `20260607021805` (its SQL comments record checking all 8 existing rows first) | ✔ | — | Resolved (migration evidence) |
| MISC-03 | No license file (README states all rights reserved) — intentional; remember before linking the repo publicly | 💡 | — | Advisory |

---

## Phase summary (traceability to ROADMAP.md)

| Phase | Finding IDs |
|---|---|
| 0 — Decisions | ✔ Complete (2026-10-26): ROAD-02 ✔, ARCH-01 ✔, SEC-01 ✔, KNOW-04 ✔, ROAD-03 ✔ — outcomes in the Decision Register |
| 1 — Correctness & hygiene | ✔ Complete (2026-10-27): BUG-01 ✔, SEC-04 ✔, DEBT-01 ✔, DEBT-05 ✔, DOC-01 ✔ (KNOW-03 unblocked). Baseline: backend 125/125 tests, frontend 62/62 tests, tsc + ESLint clean both apps. |
| 2 — Stream lifecycle & UX edges | ✔ Complete (2026-10-27): BUG-02 ✔, BUG-03 ✔, ARCH-04 ✔, ARCH-05 ✔, FEAT-04 ✔, FEAT-05 ✔, DEBT-02 ✔, DEBT-03 ✔, DEBT-04 ✔; BUG-04 deferred to Phase 5. Baseline: backend 127/127 tests, frontend 71/71 tests, tsc + ESLint clean both apps. |
| 3 — Documentation & knowledge base | DOC-02–DOC-11, ROAD-04, KNOW-01, SEC-01 (posture note in DEPLOYMENT.md) |
| 4 — Verification & reliability | TEST-01–TEST-05, INFRA-01, INFRA-02 (KNOW-02), SEC-01 (backend-exposure check) |
| 5 — V4 readiness gate + demo hardening | SEC-05, SEC-06 (LinkedIn launch gate), SEC-02, SEC-03, ARCH-02, ARCH-03, BUG-04 |
| V4 — Research Intelligence | ROAD-01, FEAT-02 (scoped after the Phase-5 gate) |

`?` = included only if trivially resolvable in its earlier phase. FEAT-01 was removed from Phase 5 by the Phase-0 caching rejection.
