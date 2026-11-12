# System Architecture & Tech Stack

[Docs](README.md)

This document describes how the full-stack Perplexity clone is structured, the technology choices made, and how data flows through the system.

---

## 1. High-Level Architecture

The project is a full-stack application split into two distinct layers:
- **Frontend**: A Next.js application with server-rendered pages, thread-data prefetch, and client components for UI, state, and Markdown rendering.
- **Backend**: A NestJS API that orchestrates database persistence, external web search, and AI provider integration.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                            │
│                                                                         │
│  ┌────────────────────┐  ┌───────────────────┐  ┌────────────────────┐  │
│  │  Feature Modules   │  │    State Layer    │  │   UI / Rendering   │  │
│  │ • thread (Turns)   │  │ • React Query    │  │ • react-markdown   │  │
│  │ • sidebar (History)│  │ • Zustand Stores  │  │ • CitationBadge    │  │
│  │ • home (Composer)  │  │                   │  │ • Highlight / GFM  │  │
│  └────────────────────┘  └─────────┬─────────┘  └────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│                       ┌─────────────────────────┐                       │
│                       │    Typed API Client     │                       │
│                       │ (/api/perplexity proxy) │                       │
│                       └────────────┬────────────┘                       │
└────────────────────────────────────┴────────────────────────────────────┘
                                     │
                                     │ HTTP / SSE Stream
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (NestJS 11)                             │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   Controllers & DTO Validation                    │  │
│  │     AskController  ·  ThreadsController  ·  SourcesController     │  │
│  └───────────────────────────────────┬───────────────────────────────┘  │
│                                      │                                  │
│                                      ▼                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         Service Layer                             │  │
│  │     AskService  ────►  TavilySearchService                        │  │
│  │          │      ────►  AiService (Groq via AI SDK)                 │  │
│  │          ▼                                                        │  │
│  │     ThreadsService / SourcesService                               │  │
│  └───────────────────────────────────┬───────────────────────────────┘  │
│                                      │                                  │
│                                      ▼                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Prisma ORM & Data Mappers                      │  │
│  │          Thread  ·  Turn  ·  Source  ·  Citation Models           │  │
│  └───────────────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────────────┴──────────────────────────────────┘
                                       │
                                       │ DATABASE_URL
                                       ▼
                         ┌───────────────────────────┐
                         │        PostgreSQL        │
                         └───────────────────────────┘
```

### Frontend Architectural Style

The frontend uses a **feature-based modular structure**. Product features live under `frontend/src/features/`.
Pages live separately under `src/app/`, while shared UI, API functions, and stores have their own directories.

#### Feature Pattern

The main responsibilities are:

1.  **Pages**: Next.js route components that compose features together.
2.  **Features**: The high-level orchestrators (e.g., `ThreadPage.tsx`).
3.  **Components**: UI pieces, some with their own interaction state (e.g., `ThreadTurn.tsx`, `CitationBadge.tsx`).
4.  **Hooks**: Custom React hooks handling business logic or API data fetching (e.g., `useThreadPage.ts`).
5.  **API Services**: Strongly typed wrapper functions around native `fetch` for communicating with the backend. These wrappers are centralized in `frontend/src/lib/api` so route components, feature hooks, and cache helpers share one contract boundary.

### Backend Architectural Style

The backend is a **modular monolith**: Ask, AI, Search, Threads, Sources, and Database modules run in one NestJS process.
Next.js and PostgreSQL run separately. There is no research worker or job queue.
The current implementation uses Groq through the AI SDK. Changing providers requires code changes; generic `AI_*` variables do not select a provider.
Compose selects PostgreSQL 17. `DATABASE_URL` selects the database host and TLS settings; the code does not require Neon.

#### Core Patterns

We utilize the standard NestJS layered architecture to maintain clear separation of concerns:

1.  **Controllers**: Entry points that receive HTTP requests and call services. A global validation pipe applies DTO rules.
2.  **Services**: Core business logic. Services coordinate between different domains (e.g., asking the Search Service for context and the AI Service for an answer).
3.  **Repositories/Prisma**: Data access layer responsible for reading and writing to the PostgreSQL database.
4.  **Mappers**: Helper utilities that transform raw database models into the clean API contracts defined in [`API.md`](API.md).



## 2. Data Flow: Asking a Question

The stream path follows this order. The JSON ask route shares query preparation and completion, but returns one result after completion.

```text
  Client                 Next.js Frontend             NestJS Backend              External APIs
    │                           │                            │                          │
    │  1. Submit question       │                            │                          │
    ├──────────────────────────►│                            │                          │
    │                           │  1. Forward ask/stream     │                          │
    │                           ├───────────────────────────►│                          │
    │                           │                            │ 2. Validate, load context│
    │                           │                            │                          │
    │                           │                            │ 3. Rewrite if context    │
    │                           │                            ├─────────────────────────►│ Groq (AI_FAST)
    │                           │                            │◄─────────────────────────┤ (resolved query)
    │                           │                            │                          │
    │                           │                            │ 4. Create PENDING turn   │
    │                           │                            │    in PostgreSQL         │
    │                           │  5. SSE: start, progress   │                          │
    │                           │◄───────────────────────────┤                          │
    │  Seed cache; new-thread   │                            │                          │
    │  navigation on start      │                            │                          │
    │◄──────────────────────────┤                            │                          │
    │                           │                            │                          │
    │                           │                            │ 6. Search context        │
    │                           │                            ├─────────────────────────►│ Tavily Search
    │                           │                            │◄─────────────────────────┤ (web sources)
    │                           │                            │    Prepare sources       │
    │                           │                            │                          │
    │                           │  7. SSE: answering         │                          │
    │                           │◄───────────────────────────┤                          │
    │                           │                            │ 7. Generate answer       │
    │                           │                            ├─────────────────────────►│ Groq (AI_DEFAULT)
    │                           │                            │◄─────────────────────────┤ (text stream)
    │                           │                            │    Buffer answer text    │
    │                           │  SSE: answer deltas        │                          │
    │                           │◄───────────────────────────┤                          │
    │  Progressive render       │                            │                          │
    │◄──────────────────────────┤                            │                          │
    │                           │                            │                          │
    │                           │  8. SSE: saving            │                          │
    │                           │◄───────────────────────────┤                          │
    │                           │                            │ 8. Normalize citations   │
    │                           │                            │    Suggest follow-ups    │
    │                           │                            ├─────────────────────────►│ Groq (AI_FAST)
    │                           │                            │◄─────────────────────────┤ (questions or [])
    │                           │                            │                          │
    │                           │                            │ 9. Save transaction      │
    │                           │                            │    in PostgreSQL         │
    │                           │                            │    Reload saved result   │
    │                           │  10. SSE: final            │                          │
    │                           │      completed, done       │                          │
    │                           │◄───────────────────────────┤                          │
    │  Update cache; show chips │                            │                          │
    │◄──────────────────────────┤                            │                          │
    │                           │                            │                          │
```

1. **Submit:** `useAskSubmit` sends the question through `streamAsk`. Browser requests use the Next.js `/api` proxy.
2. **Prepare context:** `AskService` loads an existing thread when `threadId` is present.
   The context helper selects up to five completed turns with answers.
3. **Resolve the query:** Without completed context, `AiService` uses the original question and makes no rewrite call.
   With context, the fast model receives at most three recent turns. Each prior answer uses 300 characters before an optional ellipsis.
   Rewrite failure falls back to the original question.
4. **Create the turn:** The repository saves the original question and resolved `searchQuery` in a new `PENDING` turn.
   It creates a thread when necessary and sets the thread to `RUNNING`.
5. **Start the stream:** Only after preparation does the controller open SSE and emit `start` with the saved identifiers.
   The browser seeds a temporary cached turn. For a new thread, its `start` handler navigates to `/thread/[threadId]`.
6. **Search:** `TavilySearchService` searches with the resolved query.
   The source mapper removes duplicate trimmed URLs and assigns citation numbers from 1.
7. **Generate the answer:** Groq receives the question, up to five completed prior turns, and numbered source snippets.
   Each snippet uses 1,200 characters before an optional ellipsis. The backend buffers answer text while it emits deltas.
8. **Prepare completion:** The citation helper normalizes supported number groups and extracts valid source numbers.
   The fast model then generates suggested follow-up questions. Suggestion failure returns an empty array without failing the answer.
9. **Save:** A transaction inserts sources and matching citations, then completes the turn.
   It updates the thread preview and status only if this turn is latest.
10. **Finish:** The backend reloads the saved turn and emits `final`, completion progress, and `done`.
    The frontend replaces temporary cached text with the saved result and invalidates thread-list queries.

The `preparing` event occurs after query rewrite. The `saving` stage includes suggestion generation and the database write.
Citation records identify valid saved sources; they do not verify whether each generated claim has adequate evidence.

### Reading, sources, and history

Direct thread navigation prefetches detail in the Next.js server route and hydrates the browser query cache.
`useThreadPage` reads the same query and can fetch detail in the browser when needed.
Thread detail contains all turns, sources, and citations; it has no turn pagination.

The ask result includes previews for cited sources. The Links tab lazily requests saved sources for each completed turn.
The current source hook consumes the first page only. `react-markdown`, `remark-gfm`, and `remarkCitations` render answers and citation badges.

History uses server thread summaries with search, filters, sort, and cursor pagination.
The sidebar displays the first normal history page and groups its pinned records; it does not call the dedicated pinned-list route.
Zustand retains up to 50 local history summaries for optimistic display and fallback. It does not store full answers for offline use.

### Status, recovery, and current limits

Thread status describes the latest activity. A failed latest turn can coexist with earlier completed answers.
A successful appended retry can restore the thread's completed state. This follows the [recorded status decision](FINDINGS.md#decision-register).

The client rejects a stream that ends without `final` or `error`. It can refetch detail after a failure with known turn identifiers.
The ask hook aborts on unmount. The backend passes disconnect cancellation to answer generation and attempts pending-turn failure cleanup.
Query rewrite, Tavily search, and suggestions do not receive the caller's abort signal. Their own timeouts apply.
Cleanup checks saved status before a separate failure write; it is not an atomic pending-only transition.
There is no durable recovery job for a process stop and no stream-resume route.

One hook blocks overlapping submissions on its page. Separate tabs or direct API clients can still submit concurrent turns.
The database has no single-pending-turn constraint. See ARCH-02 and the open lifecycle findings in [Findings](FINDINGS.md).

Implementation: [ask service](../backend/src/ask/ask.service.ts), [AI service](../backend/src/ai/ai.service.ts),
[thread repository](../backend/src/threads/repositories/threads.repository.ts),
[ask hook](../frontend/src/features/home/hooks/useAskSubmit.ts), and [thread server route](../frontend/src/app/thread/[threadId]/page.tsx).

## 3. Feature Status and Remaining Work

1. **Streaming — implemented.** The browser uses SSE over a POST `fetch` request.
   The backend saves a pending turn before streaming and persists the completed result after answer generation.
   Request-lifecycle limits are described above; deployed streaming still requires runtime verification.
2. **Retry semantics — implemented.** Retry validates a failed turn and appends a new attempt.
   It uses the original question and completed context from before the failed turn. The previous timeline remains intact.
3. **Share/export — partially implemented.** Users can copy thread URLs, turn URLs, Markdown, and plain text in the browser.
   Public share records, access-scoped sharing, and downloadable files are not implemented. The response Share button remains disabled.
4. **Authentication — not implemented.** The backend has no login guard, user model, or user-scoped queries.
   The roadmap first plans a single-credential demo gate and rate limits. Full user accounts and record ownership remain V5 work.

Deep Research is also planned, not implemented. The schema supports only `WEB`; `mode=deep-research` is a history-filter stub that returns no records.
The complete implementation plan remains in [Roadmap](ROADMAP.md).
