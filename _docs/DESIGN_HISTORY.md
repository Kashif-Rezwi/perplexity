# Design history and engineering decisions

[Docs](README.md) · [Findings](FINDINGS.md) · [Phase-3 plan](PHASE_3_PLAN.md)

**Reviewed:** 12 November 2026 against all eight recovered notebook photos and
the application code at `7ff6c25` (unchanged at the documentation baseline `aab9f11`).
**Final cross-check:** [13 November 2026](PHASE_3_PLAN.md#final-review--13-november-2026).
This document does not establish live deployment or provider behavior.

## Purpose and evidence

Preserve the thinking behind the application without rewriting the original
history to match today's code. Use [Architecture](ARCHITECTURE.md) and
[API](API.md) for current behavior and [Findings](FINDINGS.md) for work status.

All eight original HEIC photos, IMG_1087–IMG_1094, were recovered from the author's
Downloads folder and visually inspected. IMG_1087 carries the handwritten date
`03/06/26`; its format is preserved. At the author's request, the repository keeps
[rewritten Markdown notes, editable diagrams, and clean regenerated note images](sources/design-notebook/NOTES.md)
instead of original photo copies. The [source record](sources/design-notebook/manifest.json)
retains original filenames and SHA-256 hashes. Original HEIC files remain unchanged
outside the repository.

The page accounts below summarize the visible writing and diagrams. They are not
a claim that every crossed-out word is legible or that a checklist mark proves
implementation. The linked notes preserve the important content and recorded
uncertainties; their wording and diagrams are edited reconstructions, not facsimiles.
The regenerated images summarize the notes with a minimal digital layout; the
Markdown preserves the detailed content. Generation prompts are retained in the
[prompt set](sources/design-notebook/image-prompts.json).
The [earlier audit](https://github.com/Kashif-Rezwi/perplexity/commit/982a589) and
[Phase-0 Decision Register](FINDINGS.md#decision-register) remain historical sources;
the recovered photos now let us check their notebook claims directly.

Read claims according to their evidence:

- **Notebook evidence:** writing or a diagram directly observed in the original
  photos and retained in the linked rewritten notes.
- **Inherited history:** an earlier record, explicitly distinguished from direct evidence.
- **Recorded decision:** an outcome retained in the Decision Register.
- **Implementation/history:** present code, tests, or a specific Git change.
- **Explanation:** a consequence inferred from that implementation; it does not
  establish the author's original personal motivation or a measured result.
- **Missing:** information that cannot be recovered from the inspected material.

## Notebook source register

Each page below maps observed ideas to implemented behavior, a recorded change,
or a future boundary. The notebook's own phase labels are historical labels;
they are separate from today's Foundation Track numbering.

### IMG_1087 — Design process and principles

[Read the rewritten notes](sources/design-notebook/NOTES.md#img_1087--my-design-process).

The checklist calls for understanding/auditing the product, defining the main user,
identifying the core loop, separating core/supporting/advanced features, writing
functional/nonfunctional requirements, breaking the system into components,
tracing request/data flow, choosing an MVP vertical slice, designing APIs after
the design is clear, building small with clean boundaries, and evolving by version.
The feature-separation and requirements items are crossed out; no reason is written.

**Mapping:** these principles explain the [roadmap's version/gate structure](ROADMAP.md#ultimate-objective),
the [component boundaries](ARCHITECTURE.md#1-high-level-architecture), and the
[vertical-slice lesson](#build-the-ask-vertical-slice-first). Cross-outs/checkmarks
are described in the notes, not converted into claims that requirements work was
completed or permanently rejected.

### IMG_1088 — Framework, product definition, and users

[Read the rewritten notes](sources/design-notebook/NOTES.md#img_1088--product-users-and-design-framework).

The framework lists product understanding, requirements, constraints, data/flow
modeling, component design, trade-off evaluation, and implementation planning.
Some items are checked or crossed out; implementation planning has an empty box.
The product is described as a conversational answer engine that searches the web
in real time and returns direct, synthesized answers with inline citations/sources.
The target users are researchers, students, and professionals who need accurate,
verifiable, source-cited information rather than only a ranked list of links.

**Mapping:** [product reasoning](#original-product-reasoning), the implemented
search/answer/citation loop in [Architecture](ARCHITECTURE.md#2-data-flow-asking-a-question),
and DOC-04. Accuracy/verifiability are the intended value, not measured outcomes
of this clone. The page does not define a demographic persona or validated user study.

### IMG_1089 — Three-product observations

[Read the rewritten notes](sources/design-notebook/NOTES.md#img_1089--my-product-observations).

Under a real-time data/synthesis test, the author records these observations:

- **Perplexity:** a highly synthesized answer with a clear narrative, citations
  and source summaries; clean, readable UI; a sources tab and follow-ups.
- **ChatGPT:** synthesized information and citations judged similar, with a less
  clear narrative/readability experience; no follow-ups or clear sources tab in
  the interaction observed.
- **Claude:** a clear synthesized answer, fewer points and fuller sentences across
  a few sections; readability judged slightly clearer than ChatGPT; no source-link
  tab in the interaction observed.

**Mapping:** [product reasoning](#original-product-reasoning) / DOC-04. These are
the author's historical qualitative observations, not a current product comparison
or an independent benchmark. No test prompt, model version, settings, raw answers,
or scores appear on the page; those details cannot be reconstructed from it.

### IMG_1090 — Initial API sketch and source retrieval

[Read the rewritten notes](sources/design-notebook/NOTES.md#img_1090--my-initial-api-sketch).

The page sketches a POST `api/perplexity-ask` with a query-string field and
additional parameters, and a GET `api/list_recent` returning an array of objects.
The first response field is best read as `context_id?`; the next looks like `link?`,
followed by `status` and `title`. Preserve the earlier uncertain reading
`{context_id?, link?, status, title}` rather than imposing today's field names.

The notes explicitly label `perplexity-ask` as the query/follow-up request and
`list_recent` as the sources request, to be called after ask for a quicker response.
**Mapping:** [naming evolution](#endpoint-and-field-naming-evolution) / DOC-05;
today's ask and lazy per-turn sources flow. Source requests are now conditional
on the Links tab/actions, rather than always following every ask immediately.
The old response sketch is not a current API contract.

### IMG_1091 — Component and caching sketch

[Read the rewritten notes](sources/design-notebook/NOTES.md#img_1091--my-component-sketch).

The diagram contains a login/register bar, frontend, server, web search, database,
and response-caching blocks, plus a credits label on the server. It labels ask
and source-list calls and calls out processing web-search data, source formatting,
and checking for caching. The page does not specify credit accounting behavior.

**Mapping:** the frontend/backend/search/persistence boundaries exist in
[Architecture](ARCHITECTURE.md#1-high-level-architecture). Login/register remains
future work; the smaller Phase-5 demo gate is not full accounts. Response caching
was consciously rejected later; see [caching](#caching-proposal-and-later-decision).
Credit usage remains unbuilt and deferred; see [future boundaries](#credit-usage-deep-research-and-demo-boundaries).
The drawing is a proposal, not evidence that authentication/cache blocks were built.

### IMG_1092 — MVP and later capabilities

[Read the rewritten notes](sources/design-notebook/NOTES.md#img_1092--my-mvp-and-future-priorities).

The MVP diagram connects a frontend with ask/source-list requests to a server
that processes data and accesses web search and the database. The next-feature
list names similar-query response caching, credit-based usage, and Deep Research,
with Deep Research marked most important. The credit box has a mark, but its
meaning does not establish implementation.

**Mapping:** the core loop is implemented; [caching](#caching-proposal-and-later-decision)
was rejected; credit usage was clarified as an unbuilt intention and deferred to
V5; Deep Research remains V4's objective. See [future boundaries](#credit-usage-deep-research-and-demo-boundaries)
and the Decision Register. The already recorded author clarification governs the
credit item rather than interpreting its checkbox as a shipped feature.

### IMG_1093 — Server setup and domain model

[Read the rewritten notes](sources/design-notebook/NOTES.md#img_1093--my-server-setup-and-domain-model).

The notebook's historical “Phase 1 Server” calls for NestJS initialization,
removing unnecessary setup files, initial Prisma configuration, and schema design.
A thread is a whole research session with many turns. A turn is one question/answer
exchange with sources and citations. Sources are web evidence belonging to a turn
and can be referenced by multiple citations. A citation is an answer marker linked
to one source and one turn. Relationship arrows connect Thread → Turn → Source/Citation.

**Mapping:** these entities survive in the [Prisma schema](../backend/prisma/schema.prisma),
[repository](../backend/src/threads/repositories/threads.repository.ts), and
[current architecture](ARCHITECTURE.md). A historical server checklist does not
verify the current Foundation Phase-4 database integration work. Today's citation
records map references; they do not validate a generated claim's factual support.

### IMG_1094 — API layers and an implementation-order lesson

[Read the rewritten notes](sources/design-notebook/NOTES.md#img_1094--my-api-layers-and-implementation-order-lesson).

The API sketch shows POST ask, GET recent sources, and GET threads. A read-flow
diagram separates database records, repository queries, mappers, JSON response,
and frontend rendering. The reflection calls sources → threads → ask the wrong
build order and says ask should come first.

**Mapping:** [naming evolution](#endpoint-and-field-naming-evolution),
[vertical-slice lesson](#build-the-ask-vertical-slice-first), and DOC-03/05.
Repository/mapper/controller/UI boundaries remain visible in the implementation.
The read-layer sketch is not the current ask execution sequence; that sequence
also includes query preparation, search, AI generation, and persistence, as
documented in [Architecture](ARCHITECTURE.md#2-data-flow-asking-a-question).

## Original product reasoning

**Findings:** DOC-04 / KNOW-01. **Evidence:** directly reviewed IMG_1088/IMG_1089.

The intended users were researchers, students, and professionals seeking a direct
synthesis with inspectable sources. The original comparison considered Perplexity,
ChatGPT, and Claude. Its observations favored Perplexity's combination of narrative,
citations/source summaries, a distinct sources tab, follow-ups, and readable UI.
The page register preserves what was written for each product and the experiment's
missing details; these are historical observations, not present-day market claims.

That explains the design emphasis on an answer view plus a Links tab, inline
citations that lead to source evidence, contextual follow-up questions, and a clean
reading experience. These mechanisms now exist. Their existence does not establish
measured answer accuracy, citation quality, user satisfaction, or superior research
performance. Those claims require separate evaluation.

## Caching proposal and later decision

**Findings:** DOC-02 / ROAD-02 / FEAT-01. **Evidence:** IMG_1091/IMG_1092 and a
recorded decision on 26 October 2026.

IMG_1091/IMG_1092 propose response caching, including reuse for similar queries.
The later Decision Register rejects answer-level
caching: its rationale favors fresh answers and expects limited reuse for
context-dependent questions in this single-user application.

This is a product/engineering choice. No measured cache-hit rate, cost saving,
latency comparison, or similarity-cache evaluation supports a stronger claim.
The original proposal is preserved here as an idea that was consciously changed.
The V4 revisit condition is actual query overlap in research loops; if observed,
evaluate short-lived search-result caching by rewritten `searchQuery`.

Browser query caching and local history summaries already serve a different
purpose. They do not implement reusable provider-result or synthesized-answer
caching. See [history behavior](ARCHITECTURE.md#reading-sources-and-history) and
the [Decision Register](FINDINGS.md#decision-register).

## Build the ask vertical slice first

**Finding:** DOC-03. **Evidence:** directly reviewed IMG_1094.

IMG_1094 records the author's lesson that the APIs had been built in
the order sources → threads → ask, whereas the ask flow should have come first.
This is preserved as a reported learning, not a newly established chronology of
every implementation commit.

The useful lesson for later work is to establish the smallest complete user
journey—question, retrieval, answer, persistence, and display—before extracting
supporting endpoints. For V4, the same principle favors proving a research
workflow before expanding its supporting service surface. This is a planning
lesson; detailed V4 design still waits for the Foundation Track gate.

## Endpoint and field naming evolution

**Finding:** DOC-05. **Evidence:** IMG_1090/IMG_1094, checked against
current controllers and DTOs.

The notebook uses early `perplexity-ask`, `list_recent`/recent-sources, and
`query_str`-style names. The current public question field is `question`; JSON ask uses
`POST /perplexity/ask`, while the browser's streamed ask uses
`POST /perplexity/ask/stream`. Retry uses `POST /perplexity/ask/retry`.

Saved sources are now read from `GET /perplexity/sources?turnId=...`; thread history
uses the separate `GET /perplexity/threads` endpoint. IMG_1090 explicitly calls
`list_recent` a sources request, and IMG_1094 separately sketches threads. The
earlier audit's compressed `list_recent` → threads + sources account should not
be treated as proof that `list_recent` meant today's thread-history route. Nor
does each uncertain original response field have an established one-to-one
successor. Its uncertain reading is retained in the source register.

Evidence: [ask controller](../backend/src/ask/ask.controller.ts),
[ask DTO](../backend/src/ask/dto/ask-request.dto.ts),
[thread controller](../backend/src/threads/threads.controller.ts), and
[source controller](../backend/src/sources/sources.controller.ts).
Full contracts belong in [API](API.md).

## Technical decisions and their consequences

### Stream events over a POST request

**Finding:** DOC-08. **Evidence:** implementation/history; trade-off explanation.

The [stream route introduced in June](https://github.com/Kashif-Rezwi/perplexity/commit/2d452e9)
accepts a JSON ask body and returns `text/event-stream`. The browser uses a POST
`fetch`, reads its response body, and parses named SSE events. This carries the
question/thread identifiers and progressive results in one request. A native
GET-based `EventSource` client is not the interface used here.

The corresponding responsibility is explicit parsing, terminal-event detection,
error handling, and cancellation in the fetch client. There is no automatic
stream-resume contract. Once streaming headers are sent, an error is an in-stream
event rather than a new HTTP status. These are consequences of the checked-in
contract; the repository does not establish every original alternative considered.

Evidence: [controller](../backend/src/ask/ask.controller.ts),
[stream client](../frontend/src/lib/api/index.ts),
[parser](../frontend/src/lib/api/sse.ts), and
[client tests](../frontend/src/lib/api/index.test.ts).
See [lifecycle limits](ARCHITECTURE.md#status-recovery-and-current-limits).

### Preserve conversation activity timestamps during management actions

**Finding:** DOC-08. **Evidence:** implementation/history; trade-off explanation.

History sorting uses `Thread.updatedAt` and `id`. Rename and pin changes use
parameterized raw SQL that leaves `updatedAt` untouched, bypassing a normal
Prisma update of the `@updatedAt` field. Pinning has its own `pinnedAt` value.
Consequently, renaming or pinning does not itself move a conversation in the
activity-ordered history. This separates conversation activity from management.

The trade-off is that these writes require SQL maintenance and database-level
verification. Existing repository tests inspect mocked calls; they do not prove
real PostgreSQL transaction or timestamp behavior. That remains TEST-02.

Evidence: [repository](../backend/src/threads/repositories/threads.repository.ts),
[schema](../backend/prisma/schema.prisma), and
[repository tests](../backend/test/threads.repository.test.js).
History: [rename](https://github.com/Kashif-Rezwi/perplexity/commit/508dc2c)
and [pinning](https://github.com/Kashif-Rezwi/perplexity/commit/4a21909).

### Consolidate the active AI provider on Groq

**Finding:** DOC-08. **Evidence:** implementation and explicit commit history.

The [12 September consolidation](https://github.com/Kashif-Rezwi/perplexity/commit/432276e)
removed the multi-provider interface, factory, OpenAI adapter, and OpenAI package.
`AiService` now creates a Groq client; SDK-specific generation and output handling
live in `ai-sdk.util.ts`. Generic `AI_*` settings preserve the service's public
configuration vocabulary, but they do not select a different provider.

The resulting design has fewer provider abstractions to maintain. A provider
change requires code changes. The commit and implementation support that
simplification; they do not establish a measured price, quality, or latency
advantage. The utility also contains Groq-specific structured-output options;
live provider compatibility remains Phase-4 verification work.

Evidence: [AI service](../backend/src/ai/ai.service.ts),
[SDK utility](../backend/src/ai/utils/ai-sdk.util.ts), and
[package dependencies](../backend/package.json).

### Read provider errors from the full stream

**Finding:** DOC-08. **Evidence:** implementation, regression tests, and history.

The [12 September stream-error fix](https://github.com/Kashif-Rezwi/perplexity/commit/b917963)
predates the Groq consolidation and originally addressed the OpenAI adapter.
The current utility consumes `fullStream`, explicitly handling `text-delta`,
`error`, and `finish` parts instead of reading text alone. It unwraps provider
error details and distinguishes an empty result, content filtering, and a
length-limited empty result.

This prevents a provider error from being reported merely as an unexplained
empty answer. The trade-off is maintaining handling for SDK event/error shapes.
Tests use mocked SDK streams; they establish local handling, not real provider
delivery or deployed SSE behavior.

Evidence: [SDK utility](../backend/src/ai/utils/ai-sdk.util.ts),
[utility tests](../backend/test/ai-sdk.util.test.js), and
[ask stream-error tests](../backend/test/ask-stream-provider-error.test.js).

### Keep thread status as latest activity

**Finding:** ARCH-01; supporting Phase-0 decision.

The Decision Register keeps thread status as the state of its latest activity.
A failed latest turn can coexist with earlier successful answers; a successful
appended retry can restore `COMPLETED`. Each turn retains its own status/history.
This avoids presenting the thread status as an aggregate verdict on every answer.

The latest-turn checks and cleanup do not enforce a single pending turn or
guarantee recovery after process termination. Those limits remain ARCH-02/ARCH-06.
Evidence: [repository tests](../backend/test/threads.repository.test.js),
[ask service](../backend/src/ask/ask.service.ts), and
[status/recovery documentation](ARCHITECTURE.md#status-recovery-and-current-limits).

### Bound context and normalize citation markers

**Finding:** DOC-06; already corrected in current architecture documentation.

The answer uses up to five completed prior turns; query rewrite uses at most
three, with prior answers shortened for that rewrite. Citation normalization
supports parseable source-number markers before persistence. These mechanisms
bound context and keep saved references aligned with valid source numbers.
They do not establish optimal context size or factual support for every claim.

See the [verified ask sequence](ARCHITECTURE.md#2-data-flow-asking-a-question),
[context helper](../backend/src/ask/helpers/ask-thread-context.helper.ts),
[AI service](../backend/src/ai/ai.service.ts), and
[citation helper](../backend/src/ask/helpers/answer-citation.helper.ts).

## Credit usage, Deep Research, and demo boundaries

**Evidence:** directly reviewed IMG_1091/IMG_1092 and recorded Phase-0 decisions.

Credit-based usage was intended and never built, according to the author answer
retained in the Decision Register. Billing and user-owned records remain V5 work.
Deep Research remains the ultimate objective, with implementation deferred until
the Foundation Track gate. Its present history-filter stub is not research execution.

The planned public-demo gate is a single configured credential, a signed HttpOnly
session cookie, and an application guard, paired with strict ask limits. This was
a recorded decision on 26 October, not implemented authentication or rate limiting.
The demo remains single-tenant under that plan; full accounts remain V5.

See the [Decision Register](FINDINGS.md#decision-register),
[Phase-5 gate](ROADMAP.md#phase-5--v4-readiness-gate--demo-hardening), and
[V4 entry condition](ROADMAP.md#v4---research-intelligence--the-ultimate-objective).

## Contribution scope: frontend loading, history, sources, and citations

**Finding:** DOC-07. **Evidence:** the existing contribution account, introduced
in [attribution commit `0e08b45`](https://github.com/Kashif-Rezwi/perplexity/commit/0e08b45),
moved here from the roadmap with its scope preserved.

Kashif's contribution for the V2 loading, skeleton, empty-state,
history-cache, lazy-source, and citation-tooltip polish was frontend-only
because this feature required no backend implementation. The work covered
React/Next.js UI components, route and panel loading states, contextual empty
states, React Query cache sharing and request deduplication, lazy source loading
for the Links tab, citation popup positioning plus hover/focus behavior,
accessibility refinements, and focused frontend tests.

Backend/API routes, database schema or persistence changes, object storage, and
deployment changes were outside this feature's scope.

This is the account of that specific contribution. It does not assign authorship
of every feature or every later change in the repository. Representative evidence:
[loading and lazy sources](https://github.com/Kashif-Rezwi/perplexity/commit/224e4a8),
[contextual history empty states](https://github.com/Kashif-Rezwi/perplexity/commit/494fe32),
[citation interaction refinements](https://github.com/Kashif-Rezwi/perplexity/commit/8bcc514),
and the current [source hook](../frontend/src/features/thread/hooks/useThreadSources.ts).
