# Engineering Findings Inventory

[Docs](README.md)

**Purpose:** Traceable inventory of recorded findings from the
repository audit, used to drive the Foundation Track phases in
[ROADMAP.md](ROADMAP.md). This file is the tracker: update dispositions and
statuses here as decisions are made and work completes.

**Historical source:** Repository audit + reconciliation against the original
design notebook (photos IMG_1087–IMG_1094, dated 03/06/26). Verification
performed during the audit: backend 125/125 tests, frontend 57/57 tests,
`tsc --noEmit` and ESLint clean in both apps.

## Documentation Cross-Check — 12 November 2026

All ten project Markdown files were checked against the current checkout at `7ff6c25`.
Evidence included controllers, DTOs, services, repositories, UI callers, tests, package files, environment examples, Prisma, and Docker configuration.

- Architecture now separates implemented streaming/retry, partial copy/export, and absent authentication.
- The ask sequence now agrees with code: query resolution, pending turn, SSE start, search, answer, suggestions, transaction, final result.
- API details now cover validation, errors, ordering, pagination limits, and actual frontend callers.
- Setup requirements, provider coupling, deployment probes, cancellation, and logging claims now match the checked-in code.
- Stale findings and roadmap claims were corrected below. Historical phase baselines retain their dates.
- Fresh checks passed: backend 127 tests, frontend 71 tests across 18 files, plus ESLint and TypeScript in both applications.
- Document checks passed: 14 route headings matched controllers, 17 API JSON examples parsed, and 52 local links/anchors resolved.

Live providers, PostgreSQL integration, container builds, deployment revision, and browser workflows were not exercised in this check.
The original notebook images were unavailable during that cross-check. Its notebook
claims were inherited history; the later Phase-3 source review below supersedes that limit.

## Phase 3 Source Review — 12 November 2026

All eight original HEIC photos, IMG_1087–IMG_1094, were recovered from the author's
Downloads folder and visually inspected. [Design history](DESIGN_HISTORY.md)
now preserves a page-by-page account and maps each page to present behavior,
recorded decisions, or explicit changes/deferrals. At the author's request, the
repository preserves [rewritten notes, diagrams, and regenerated visual summaries](sources/design-notebook/NOTES.md)
and a [source record](sources/design-notebook/manifest.json) instead of original photo copies.
The original photos remain outside the repository.

- The target users and Perplexity/ChatGPT/Claude observations are preserved as
  historical product reasoning, with no claim of a current benchmark.
- The early `list_recent` sketch explicitly describes sources; the later page
  separately sketches threads. The naming account now preserves that distinction.
- Caching, the ask-first lesson, server/domain-model notes, future capabilities,
  technical trade-offs, and the frontend contribution account have a durable home.
- Uncertain response fields, crossed-out writing, and ambiguous checklist marks
  remain explicit; a mark is not evidence that a feature shipped.

The [execution plan](PHASE_3_PLAN.md) records the six microtasks and final checks.
Phase-4 runtime/CI/integration work and Phase-5 hardening remain open. No
application implementation or production-readiness claim was added by Phase 3.

**Final cross-check, 13 November 2026:** all eight original/generated page pairs,
the detailed notes, technical evidence, and completion criteria were reviewed
again. Two image wording/source-attribution corrections and the IMG_1091 credits
label are recorded in the [final review](PHASE_3_PLAN.md#final-review--13-november-2026).
Phase 3 remains complete; later-phase verification and hardening remain open.

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
5. Resolved rows retain historical problem descriptions. Read the disposition for current behavior; a recorded decision does not imply implemented code.

---

## Decision Register

All Phase-0 items were decided on 2026-10-26. New decisions get appended here
with their date, outcome, and rationale.

| # | Question | Findings | Decision (2026-10-26) | Status |
|---|---|---|---|---|
| 1 | **Response caching**: notebook listed it three times; code and docs dropped it. Implement, roadmap, or deliberately reject? | ROAD-02 / DOC-02 / FEAT-01 | **Rejected for answer-level caching** — the recorded rationale prioritizes fresh answers and expects low reuse for contextual single-user questions. No measured cache-hit rate is available. **V4 revisit trigger:** evaluate short-lived search-result caching by rewritten `searchQuery` if research loops show query overlap | ✅ Decided |
| 2 | **Thread failure semantics**: latest-turn failure marks the thread FAILED even with earlier completed turns. Keep or recompute? | ARCH-01 | **Keep + document** — thread status describes latest activity; successful retry can restore COMPLETED. This behavior is test-covered and now documented in ARCHITECTURE.md | ✅ Decided |
| 3 | **Public demo posture**: no application auth or rate limits on paid-API endpoints; a Vercel demo URL is documented. Accept / add an edge gate / take private? | SEC-01 | **Revised same day:** plan a single-credential demo gate, `/login`, signed HttpOnly session cookie, and a global `/perplexity/*` guard. Add strict ask limits and lenient read limits with `@nestjs/throttler`. Threads remain single-tenant; full accounts stay V5. Backend-exposure verification is still scheduled for Phase 4. SEC-05 and SEC-06 remain unimplemented Phase-5 work | ✅ Decided (revised) |
| 4 | **Notebook clarifications**: (a) IMG_1090 `list_recent` fields; (b) IMG_1092 credit-based usage; (c) caching intent | KNOW-04 / ROAD-03 | **Recorded author answers:** credit usage was intended but not built and remains V5 work. The best-effort reading of (a) is `{context_id?, link?, status, title}`; the planned journal must preserve that uncertainty. Caching follows Register #1 | ✅ Answered |

---

## 1. Documentation Gaps & Inconsistencies

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| DOC-01 | Ask-flow documentation disagreed with `AskService.preparePendingAsk` and `createAskStream` | ✔ | P0 | Rechecked and corrected on 2026-11-12: both the diagram and prose now place query resolution before pending-turn creation and search after SSE start. This supersedes the incomplete Phase-1 correction claim |
| DOC-02 | Recorded notebook caching notes needed a durable design-history account | ✔ | P1 | Recorded in [Design history](DESIGN_HISTORY.md#caching-proposal-and-later-decision), checked against IMG_1091/1092 on 2026-11-12. Register #1 remains the policy decision; no measured cache-hit claim |
| DOC-03 | Notebook lesson: build the ask vertical slice before sources/threads APIs | ✔ | P1 | IMG_1094 directly reviewed; [journal lesson](DESIGN_HISTORY.md#build-the-ask-vertical-slice-first) preserves the reflection and its future planning implication |
| DOC-04 | Target-user persona + 3-way comparison (IMG_1088/1089) needed a durable account | ✔ | P1 | Original photos reviewed on 2026-11-12. [Product reasoning](DESIGN_HISTORY.md#original-product-reasoning) records researchers/students/professionals and Perplexity/ChatGPT/Claude observations. Historical qualitative comparison only; prompt/settings/raw answers/scores are absent from the page |
| DOC-05 | Early endpoint/field naming needed a history account | ✔ | P2 | [Naming evolution](DESIGN_HISTORY.md#endpoint-and-field-naming-evolution) checked against IMG_1090/1094 and current controllers/DTOs. Corrects the earlier compressed mapping: `list_recent` explicitly meant sources; threads were sketched separately. Uncertain original fields remain marked |
| DOC-06 | Architecture omitted citation normalization and the 3-turn rewrite / 5-turn answer context split | ✔ | P2 | Added on 2026-11-12 with source references. Normalization does not establish factual support for claims |
| DOC-07 | The personal "Contribution Scope" account was stored within roadmap phase tracking | ✔ | P2 | Moved to [Design history](DESIGN_HISTORY.md#contribution-scope-frontend-loading-history-sources-and-citations), preserving the original account and linking attribution/implementation commits; roadmap retains a link |
| DOC-08 | Technical mechanisms needed a design-history account: POST SSE, SQL timestamp preservation, Groq adapter, and `fullStream` errors | ✔ | P2 | [Technical decisions](DESIGN_HISTORY.md#technical-decisions-and-their-consequences) links code, tests, and commits for all four mechanisms. Distinguishes original change history from inferred consequences; real DB/provider/deployment verification remains Phase 4 |
| DOC-09 | API documentation omitted the error envelope and HTTP-200 stream failure semantics | ✔ | P2 | Added on 2026-11-12, including string/array messages, retryable flags, and client-side ApiError behavior |
| DOC-10 | Database-host wording and live-demo assertions exceeded repository evidence | ✔ | P2 | Corrected on 2026-11-12: Compose selects PostgreSQL 17; Neon is optional; the demo URL is documented but runtime state is unverified |
| DOC-11 | Proposal (not a defect): a design-decisions/journal doc as the durable home for DOC-02/03/04/05/08 | ✔ | P1 | [Design history](DESIGN_HISTORY.md) created on 2026-11-12 with all eight source-page mappings, decisions, technical trade-offs, evidence limits, and attribution |
| DOC-12 | Current features appeared under future work; test, runtime, provider, and deployment claims drifted across docs | ✔ | P1 | Cross-checked all ten Markdown files on 2026-11-12. Corrected feature status, Node minimum, test coverage, provider coupling, API details, and deployment/logging/cancellation limits; verification scope is recorded above |

## 2. Bugs & Functional Issues

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| BUG-01 | Before Phase 1, error handling could read a consumed response body twice and mask non-JSON errors | ✔ | P0 | `readErrorMessage` now reads text once and handles JSON strings, validation arrays, raw text, and empty bodies. Used by both API paths; five client tests cover the behavior |
| BUG-02 | Before Phase 2, a stream without `final` or `error` had no terminal-event check | ✔ | P1 | Phase 2 added the terminal check, removed `onDone`, wired browser cancellation, and added backend cleanup that reads saved status before failure. This does not guarantee recovery after process termination or make cleanup atomic; see ARCH-02 and ARCH-06 |
| BUG-03 | Before Phase 2, citation conversion could enter existing Markdown links and create nested links | ✔ | P1 | The plugin now skips `link`, `code`, and `inlineCode` nodes; the reproduction test remains in the suite |
| BUG-04 | Cursor behavior for a deleted cursor and changing `updatedAt` sort keys lacks real-database coverage | ◐ | P2 | Phase 5 investigation/keyset design. The query uses an ID cursor and `skip: 1`; exact missing-cursor behavior requires PostgreSQL reproduction, not a claim of verified silent row loss |

## 3. Feature Gaps & Incomplete Implementations

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| FEAT-01 | Provider-result and answer caching are absent; browser query/history caches do exist | ✔ | — | Resolved by decision, not implementation: answer caching rejected in Register #1. Revisit search-result caching only on measured research-query overlap |
| FEAT-02 | `ThreadListQueryDto` accepts `mode=deep-research`; `ThreadsService.listThreads` returns an empty list; schema mode remains WEB only | ✅/💡 | P3 | Filter stub only. No Deep Research execution exists; V4 scope |
| FEAT-03 | Intentional placeholders: "Sign in" button (no handler), "Share" button (disabled "coming soon"), AskInput "Search" mode pill (decorative) | 💡 | — | Accepted deferrals (V5 auth; share deferred) |
| FEAT-04 | Before Phase 2, the thread actions menu was hidden on small screens | ✔ | P2 | The current menu has no small-screen visibility restriction |
| FEAT-05 | Before Phase 2, the UI did not expose the existing turn-URL helper | ✔ | P2 | `TurnResponseActions` now uses `createTurnUrl` for "Copy link to this turn" |

## 4. Architecture & Design Issues

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| ARCH-01 | The thread API can report FAILED while earlier turns remain COMPLETED | ✔ | — | Accepted latest-activity semantics, test-covered and documented in ARCHITECTURE.md. Successful appended retry can restore COMPLETED |
| ARCH-02 | No single-pending-turn constraint. Latest-turn and abandoned-turn status guards use separate reads and writes | ◐ | P2 | Now documented. One hook blocks concurrent submission on its page; separate tabs/direct clients can overlap. No explicit serialization or atomic pending-only cleanup is enforced; runtime races need database integration tests |
| ARCH-03 | Thread detail returns all turns, sources, and citations without a bound. Ask preparation also loads full detail before selecting recent context | ✅ | P2 | Phase 5: bound context reads and define turn pagination. Production capacity has not been measured |
| ARCH-04 | Before Phase 2, the thread page had two independent ask hooks | ✔ | P2 | One hook in `useThreadPage` now gates submit and retry on that page. `AskInput` is presentational; `HomeAskInput` owns the home instance. This is not a cross-tab concurrency constraint |
| ARCH-05 | Before Phase 2, temporary frontend thread data hardcoded web mode | ✔ | P2 | The backend start event now supplies mapped `mode`; frontend cache seeds use `event.mode`. The schema still supports WEB only |
| ARCH-06 | Request-lifecycle limits: rewrite, search, and suggestions lack caller cancellation; no durable pending-turn recovery exists | ✅ | P2 | Confirmed in `AskService`, `AiService`, and `TavilySearchService`. Caller abort reaches answer generation only. Search timeout ends the application wait without aborting Tavily; define broader recovery before long research workflows |

## 5. Code Quality & Technical Debt

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| DEBT-01 | Historical unused wrappers, query keys, exports, props, and callbacks | ✔ | P0 | Phase 1 removed unused wrappers/keys and exports. Phase 2 removed `onDone`, wired `signal`, and used `createTurnUrl`. `TurnResponseActions` now requires `threadId`/`turnId` for the implemented turn-link action; these are no longer unused props |
| DEBT-02 | Before Phase 2, source-list and embedded-source provider fields differed | ✔ | P2 | Both contracts now include `provider` and `providerScore`; backend mapper and frontend types agree |
| DEBT-03 | The local history store previously lacked a storage version | ✔ | P2 | It now uses `version: 1`. A migration function is still absent; the store is a summary cache, not the answer database |
| DEBT-04 | Before Phase 2, history search queried on each keystroke | ✔ | P2 | Server search now uses a 300 ms debounce; input text updates immediately |
| DEBT-05 | Earlier tooling used stale Jest globals and lacked unused-code checks | ✔ | P2 | Both tsconfigs enable `noUnusedLocals`/`noUnusedParameters`; ESLint enforces unused variables. Backend globals are Node-only. `strictPropertyInitialization` remains false; Phase 1 did not change that setting |
| DEBT-06 | Markdown-stripping duplicated across layers (backend `ask-text.util.ts` vs frontend `threadExport.markdownToPlainText`) — different purposes; acceptable | ✅ | — | Accepted; no refactor |
| DEBT-07 | `completeTurn` inserts mapped sources sequentially. Tavily requests five results by default; `TAVILY_MAX_RESULTS` is configurable | ✅ | — | Accepted at the default size. Five is not a hard application cap; evaluate batching if source counts grow |

## 6. Testing & Reliability Gaps

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| TEST-01 | No HTTP-level/e2e tests: controllers only route-smoke-tested; exception filter, logging interceptor, SSE abort wiring, CORS/bootstrap untested | ✅ | P1 | Phase 4 |
| TEST-02 | No real-DB tests — raw SQL regex-matched only; transaction semantics fully mocked | ✅ | P1 | Phase 4 (minimal dockerized-Postgres suite for repositories) |
| TEST-03 | Frontend coverage is partial: Vitest defaults to Node, while DOM hook tests select `happy-dom` and use Testing Library | ◐ | P1 | Phase 2 added three `useAskSubmit` tests. Full route transitions, thread-management mutations, and interactive workflows still need broader tests in Phase 4; test-environment setup already exists |
| TEST-04 | No CI pipeline (README states this honestly) | ✅ | P1 | Phase 4 (lint + typecheck + both suites) |
| TEST-05 | Unverified externals: live Tavily payload shape (`publishedDate`), real Groq stream behavior, Docker image builds, Vercel SSE behavior | ❓ | P1 | Phase 4 verification tasks (KNOW-02) |

## 7. Security & Configuration Concerns

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| SEC-01 | Application routes have no authentication, ownership, or rate limits. The documented demo's runtime controls remain unverified | ✅ | — | Register #3 chooses a Phase-5 demo gate and rate limits; code is still absent. Backend-exposure checks remain Phase 4. DEPLOYMENT.md states that the frontend proxy itself is not an access control |
| SEC-02 | Rendered source icons request Google's `/s2/favicons`, sending those source domains from the browser | ✅ | P2 | Phase 5 (first-party proxy/cache or accept) |
| SEC-03 | Checked-in headers define no CSP. Markdown rendering uses URL sanitization and no `rehype-raw`; edge headers are unverified | ✅ | P2 | Phase 5 |
| SEC-04 | Before Phase 1, root ignore rules did not cover every `.env.*` variant | ✔ | P0 | Root rules now ignore `.env` and `.env.*`, with an exception for `.env.example` |
| SEC-05 | Demo-gate authentication (Register #3, revised 2026-10-26): single env-configured access credential; `/login` → signed HttpOnly session cookie; global guard on `/perplexity/*`. Explicitly NOT user accounts — threads stay single-tenant; full multi-user auth remains V5 | ✅ (decision) | P1 | Implement in Phase 5 (LinkedIn launch gate) |
| SEC-06 | Rate limiting before public launch: `@nestjs/throttler` — strict limits on money-spending endpoints (`POST /perplexity/ask*`), lenient global/read limits; gateway-level limits still recommended per DEPLOYMENT.md | ✅ (decision) | P1 | Implement in Phase 5 (with SEC-05) |

## 8. Performance & Scalability

Performance-related findings include ARCH-03 (unbounded payload), the resolved
DEBT-04 (search debounce), and DEBT-07 (sequential inserts).
Answer caching was rejected by decision, not measured benchmarking. Model choice,
source limits, context size, and suggestion timing also affect latency and usage.
This review did not perform a load test or establish production capacity.

## 9. Infrastructure, Integration & Deployment

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| INFRA-01 | Docker images not build-verified during the audit (`docker compose build` never ran; builder-stage placeholder `DATABASE_URL` is documented and safe) | ❓ | P1 | Phase 4 verification |
| INFRA-02 | Vercel deployment: whether the SSE proxy guidance in DEPLOYMENT.md §7 is honored by the live deployment is unverifiable from the repo | ❓ | P1 | Phase 4 verification |
| INFRA-03 | `DELETE /perplexity/threads` carries a JSON body — some proxies/clients strip DELETE bodies (works in the fetch-based client) | ✅/💡 | — | Accepted; revisit only if a client breaks |
| INFRA-04 | No explicit pool-tuning code, connection-startup retry, or Prisma query logging. Connection URLs can supply additional settings | 💡 | — | Accepted for V2. Compose orders startup; non-Compose deployments need equivalent dependency handling |

## 10. Feature & Product Roadmap Gaps

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| ROAD-01 | V4 prerequisites include ARCH-03 payload bounds, FEAT-02 research execution, and request-lifecycle limits. ARCH-05's stream-mode seed fix is complete | ✅ | P3 | Phase-5 entry decisions remain. Cost and demo-control choices are recorded; demo controls still require implementation |
| ROAD-02 | Answer-cache policy required a decision | ✔ | — | Register #1 rejects answer caching and records the V4 search-cache revisit trigger |
| ROAD-03 | Notebook IMG_1092 "credit based usage" checkbox — clarified by the author: an intended feature, never built; consciously deferred as not necessary now | ✔ | — | Resolved — remains covered by V5 Billing/Limits; no new work |
| ROAD-04 | Dockerfiles and Compose existed while roadmap status lagged | ✔ | P2 | Artifacts are marked implemented. This is distinct from build verification or a verified live rollout, which remain open |

## 11. Engineering Process & Knowledge Gaps

| ID | Finding | State | Priority | Disposition (Phase) |
|---|---|---|---|---|
| KNOW-01 | Original thinking preservation: notebook decisions, product reasoning, API-ordering lesson, and naming evolution needed a durable home | ✔ | P1 | [Design history](DESIGN_HISTORY.md#notebook-source-register) accounts for all eight recovered/visually reviewed pages and retains later decisions/changes separately; rewritten notes, diagrams, regenerated visual summaries, and original source hashes are preserved without committing the photos |
| KNOW-02 | Public write-ups should follow dynamic verification (TEST-05) — don't publish flow claims you haven't watched run | 💡 | P1 | Phase 4 |
| KNOW-03 | Public descriptions need the verified ask order from DOC-01 | ✔ | P1 | Full diagram/prose correction rechecked on 2026-11-12. Live-flow claims still require runtime verification under KNOW-02 |
| KNOW-04 | Notebook ambiguities — answered by the author (Register #4): credit-usage intent clarified; IMG_1090 `list_recent` fields remain a best-effort reading `{context_id?, link?, status, title}` | ✔ | — | Resolved (Register #4); uncertainty retained after direct photo review in the [source register](DESIGN_HISTORY.md#img_1090--initial-api-sketch-and-source-retrieval) |

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
| 0 — Decisions | Recorded complete on 2026-10-26: cache, status, demo posture, and notebook answers. SEC-01's decision did not implement SEC-05/06 |
| 1 — Correctness & hygiene | Recorded checkpoint, 2026-10-27: BUG-01, SEC-04, DEBT-01, DEBT-05. Historical baseline: backend 125/125 and frontend 62/62, types/lint clean. DOC-01's incomplete correction was superseded on 2026-11-12 |
| 2 — Stream lifecycle & UX edges | ✔ Complete (2026-10-27): BUG-02 ✔, BUG-03 ✔, ARCH-04 ✔, ARCH-05 ✔, FEAT-04 ✔, FEAT-05 ✔, DEBT-02 ✔, DEBT-03 ✔, DEBT-04 ✔; BUG-04 deferred to Phase 5. Baseline: backend 127/127 tests, frontend 71/71 tests, tsc + ESLint clean both apps. |
| 3 — Documentation & knowledge base | Complete, 2026-11-12. DOC-01/06/09/10/12 and ROAD-04 were corrected; DOC-02/03/04/05/07/08/11 and KNOW-01 now have journal/source/attribution evidence. See [execution record](PHASE_3_PLAN.md) |
| 4 — Verification & reliability | TEST-01–TEST-05, INFRA-01, INFRA-02 (KNOW-02), SEC-01 (backend-exposure check) |
| 5 — V4 readiness gate + demo hardening | SEC-05/06, SEC-02/03, ARCH-02/03/06, BUG-04; implementation/runtime evidence still required |
| V4 — Research Intelligence | ROAD-01, FEAT-02 (scoped after the Phase-5 gate) |

`?` = included only if trivially resolvable in its earlier phase. FEAT-01 was removed from Phase 5 by the Phase-0 caching rejection.
