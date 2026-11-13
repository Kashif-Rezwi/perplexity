# Phase 3 — Scope and execution plan

[Docs](README.md) · [Roadmap](ROADMAP.md) · [Findings](FINDINGS.md)

**Started and completed:** 12 November 2026. **Status:** complete.
**Final source and implementation review:** 13 November 2026.
**Baseline:** `develop` at `aab9f11`; application code is unchanged since the Phase-2 checkpoint `7ff6c25`.

## What this phase accomplishes

Phase 3 preserves the reasoning behind the product and brings the knowledge base
into agreement with the post-Phase-2 implementation. Its output is documentation
that a future contributor can use to understand what was intended, what changed,
why a decision was made, and which claims still need evidence.

This is a bounded documentation effort. It does not introduce product features,
change API behavior, redesign the architecture, or implement Deep Research.
HTTP/database/browser integration tests, CI, container builds, and deployed SSE
verification belong to Phase 4. Demo authentication, rate limits, and remaining
lifecycle/pagination hardening belong to Phase 5.

## Work already completed before this plan

- **DOC-01 / KNOW-03:** the ask-flow diagram and prose describe query resolution
  before pending-turn creation, with search after SSE starts.
- **DOC-06:** architecture documents citation normalization and the three-turn
  rewrite / five-turn answer context split.
- **DOC-09:** API documentation covers the error envelope and stream failures
  after HTTP 200 has begun.
- **DOC-10:** setup/deployment wording distinguishes checked-in configuration
  from an observed live deployment; Neon is optional.
- **DOC-12:** the 12 November cross-check reconciled feature status, contracts,
  setup requirements, and verification limits across the existing documentation.
- The Docs index provides a reading order. The Phase-0 Decision Register already
  records caching, latest-activity thread status, demo posture, and credit-usage
  decisions. These decisions do not need to be made again.

Evidence: [cross-check record](FINDINGS.md#documentation-cross-check--12-november-2026),
[current architecture](ARCHITECTURE.md), and [API](API.md).
Independent baseline checks on 12 November passed 127 backend tests, 71 frontend tests, and
TypeScript/ESLint in both applications. They did not exercise live providers,
PostgreSQL integration, containers, deployment, or complete browser workflows.

## Work carried into this phase

- **DOC-02:** preserve the notebook's caching proposal, the recorded rejection
  of answer caching, its rationale, and the V4 search-cache revisit condition.
- **DOC-03:** preserve the lesson about building the ask vertical slice before
  splitting out sources and thread APIs.
- **DOC-04:** recover the original target-user persona, the three-product
  comparison, and its actual observations; distinguish these from later inference.
- **DOC-05:** explain the recorded evolution of endpoint and field names.
- **DOC-07:** move the specific frontend contribution account out of phase tracking
  without changing its attribution or broadening its scope.
- **DOC-08:** document POST SSE, timestamp-preserving SQL, the Groq consolidation,
  and explicit provider-stream error handling, with code/commit evidence.
- **DOC-11 / KNOW-01:** give these accounts a durable home in
  [Design history](DESIGN_HISTORY.md), including notebook-page traceability.

## Expected result

A reader should be able to answer five questions from the finished documents:

1. Who was the original product for, what problem was being explored, and which
   observations did the original comparison exercise record?
2. How did the notebook's ideas become the present ask/search/answer loop, and
   which proposals were changed, rejected, or deferred?
3. What practical trade-offs explain the current implementation, and what limits
   must a future V4 design account for?
4. What did the recorded frontend contribution cover?
5. Where is the evidence for each answer, and where does certainty end?

Keep responsibilities distinct: architecture/API/setup docs describe current
behavior; the journal preserves reasoning and evolution; Findings tracks stable
IDs and dispositions; the roadmap sequences remaining work. Link between them
instead of copying complete contracts into the journal.

## Microtasks and execution method

For each task, follow **Plan → Action → Review**: inspect sources and acceptance
criteria, write the smallest complete change, then check claims/links and record
the result here and in the relevant finding. A task is complete only when its
stated check passes. Tasks are executed individually;
there is no need for parallel agents or a new process framework.

### P3-01 — Establish scope and evidence

- **Output:** this plan, a finding inventory, and an eight-page source register.
- **Check:** every remaining finding has an output and every expected notebook
  page has a known evidence state; unknown content is not reconstructed by guesswork.
- **Result:** complete. Current documents, the original audit `982a589`, Phase-0
  decisions `ed44bac`, and relevant implementation commits were inspected. All
  eight original HEIC photos were recovered from the author's Downloads folder
  and visually read. The journal's [source register](DESIGN_HISTORY.md#notebook-source-register)
  maps them individually, with rewritten Markdown notes, editable diagrams, clean
  regenerated visual summaries, and original source hashes in the repo. Original
  photo copies are excluded at the author's request.

### P3-02 — Record verifiable decisions and evolution

- **Output:** journal entries for DOC-02/03/05/08 and the already decided status,
  credit, and demo boundaries where they explain the evolution.
- **Check:** distinguish inherited notebook accounts, recorded decisions,
  implementation evidence, and present-day explanation. Link to code/tests and
  relevant commits; do not claim measured cache economics or live-provider validation.
- **Result:** complete. The journal preserves the caching/vertical-slice/naming
  history and all four technical mechanisms with code/test/commit evidence. The
  recovered pages correct an oversimplification in the earlier naming account:
  `list_recent` is labeled a sources request; threads are sketched separately.

### P3-03 — Preserve contribution attribution

- **Output:** move the existing frontend contribution account to the journal;
  replace its roadmap section with a short link.
- **Check:** preserve the named contributor and feature scope; do not infer that
  this one contribution describes authorship of the whole product.
- **Result:** complete. The contribution account is preserved in the journal,
  with attribution commit `0e08b45` and representative implementation evidence.
  The roadmap links to its new home.

### P3-04 — Complete notebook traceability and product history

- **Output:** account for IMG_1087–IMG_1094, link each page to journal entries and
  current decisions/changes, and complete the persona/comparison account (DOC-04).
- **Check:** all eight pages have meaningful, source-supported mappings; the
  uncertain `list_recent` reading remains visibly uncertain unless clarified.
- **Result:** complete. Each recovered page has an observed-content account and
  a current implementation/decision/change mapping. Target users are researchers,
  students, and professionals; the comparison names Perplexity, ChatGPT, and Claude.
  Its qualitative observations are preserved as historical observations. The pages
  provide no exact test prompt, model settings, raw answers, or scores; the journal
  records that limit rather than inventing a reproducible benchmark. Uncertain
  `list_recent` fields and ambiguous checklist marks remain explicit.

### P3-05 — Connect and verify the documentation

- **Output:** index/roadmap/finding links to the journal and plan; consistent
  claims and preserved finding IDs.
- **Check:** local links and heading anchors resolve, linked code/commit evidence
  exists, `git diff --check` passes, and no application files have changed.
- **Result:** complete. Documentation checks cover local links/anchors, commit
  references, API JSON examples, all eight source hashes, and page accounts.
  The moved contribution account matches its baseline text exactly. Following
  the author's format preference, rewritten notes and regenerated visual summaries
  replace the photo archive; original photo files are excluded. `git diff --check`
  passes and all changes are confined to `_docs/`.
  Application suites were not repeated for documentation-only changes to already
  verified, unchanged application code.

### P3-06 — Close Phase 3 and hand off to Phase 4

- **Output:** evidence-based final dispositions in Findings and a completed
  Phase-3 checkpoint in the roadmap, with the Phase-4 scope still explicit.
- **Check:** all completion criteria below pass. Do not mark the whole phase done
  merely because a journal file exists.
- **Result:** complete. Phase-3 findings are resolved with journal/source evidence,
  the roadmap records completion, and Phase 4 is identified as next. Runtime,
  deployment, CI, and hardening findings remain open in their existing phases.

## Completion criteria

- [x] Scope, existing completed work, remaining IDs, and execution order recorded.
- [x] Journal contains the known decisions, technical trade-offs, naming evolution,
  original product reasoning, and preserved contribution attribution.
- [x] Every notebook page maps to a documented decision or explicitly recorded
  change, using original evidence or a labeled author account.
- [x] Persona/comparison details are recovered and uncertainty is explicit.
- [x] Current-behavior docs remain consistent with code and planned work is labeled.
- [x] Links, evidence references, and whitespace checks pass for the final changes.
- [x] Findings and roadmap reflect the actual results and identify Phase 4 as next.

The original acceptance criterion is retained. All eight pages were available for
review; no source-availability exception is needed. Illegible fields, ambiguous
marks, and experiment details absent from the notebook remain recorded limitations.
They are not silently filled in or converted into implementation claims.

## Final review — 13 November 2026

Compared all eight original HEIC pages with the detailed notes, journal accounts,
and regenerated PNGs. Checked technical explanations against the application
source and cited commits, and checked closure against the original Phase-3 scope.

- **IMG_1087:** all eleven process items remain in the text. The minimal image
  combines component modeling and flow tracing into one item; crossed-out marks
  remain an explicit uncertainty in the notes.
- **IMG_1088/1089:** product definition, users, and the three-product observations
  agree with the originals. Corrected image 02's footer to cite both pages, since
  its reading/follow-up priorities come from IMG_1089. Historical observations
  remain distinct from a current comparison or measured benchmark.
- **IMG_1090:** ask and source-retrieval responsibilities match the sketch.
  Uncertain response fields remain in the text and are omitted from the image;
  `list_recent` is not recast as today's thread-history route.
- **IMG_1091:** component relationships and proposed login/cache features agree.
  Added the visible credits label to the detailed notes and journal; the sketch
  does not specify accounting behavior or prove credits were built.
- **IMG_1092:** MVP relationships and all three future features are preserved.
  The image labels later decisions separately; their source is the Decision Register.
- **IMG_1093:** entity meanings and relationship directions agree with the original.
  Server-setup details remain in the text. A citation mapping does not prove
  factual support, and the historical model is not a complete current schema.
- **IMG_1094:** read-layer order and the ask-first lesson agree. Replaced image 08's
  inferred question/search/answer/save/display sequence with **Ask first → sources
  and threads next**. The image now preserves the recorded build-order lesson
  without suggesting a runtime sequence; streamed text can display before saving.

Both targeted image edits used built-in image generation and were visually
checked after regeneration. The prompt file preserves the initial prompts and
the revision instructions; the manifest records the final hashes and dimensions.
The other six images required no change. Minimal images intentionally omit detail;
the edited Markdown notes retain the important content and uncertainties.

Technical cross-checks confirm POST SSE/fetch, raw SQL that preserves activity
timestamps, Groq provider coupling, explicit `fullStream` error handling, bounded
prior-turn context, and the documented ask order. The stream-error fix predates
the Groq consolidation. Contribution attribution remains unchanged.

Final checks passed across 13 project Markdown files: 182 local file/anchor
references including manifest references, 10 linked Git commits, 14 API route
headings matched to controllers, and 17 parsed API JSON examples. All eight
original and generated-image hash pairs and PNG dimensions match the manifest.
All 60 finding IDs are preserved, and the eight remaining Phase-3 findings have
resolved dispositions. The contribution account matches its baseline exactly.
`git diff HEAD --check` passes; all changes are confined to `_docs/`, and no
original notebook photographs are included. The application source remains at
the verified Phase-2 baseline.

**Conclusion:** Phase 3 satisfies its documentation and source-traceability
criteria. Runtime/provider/database/browser/CI/deployment checks remain Phase 4;
demo controls and remaining lifecycle hardening remain Phase 5. Application
suites were not rerun for these documentation/image-only changes.
