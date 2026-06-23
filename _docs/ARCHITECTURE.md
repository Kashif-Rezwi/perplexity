# System Architecture & Tech Stack

This document describes how the full-stack Perplexity clone is structured, the technology choices made, and how data flows through the system.

---

## 1. High-Level Architecture

The project is a full-stack application split into two distinct layers:
- **Frontend**: A server-rendered Next.js application that handles UI, state management, and markdown rendering.
- **Backend**: A NestJS API that orchestrates database persistence, external web search, and AI provider integration.

### Frontend Architectural Style

The frontend utilizes a **Feature-based Modular Structure**. Rather than grouping files strictly by type (e.g., all components in one folder, all hooks in another), code is organized by the product feature it belongs to.

#### Feature Pattern
Inside `frontend/src/features/`, you will find directories like `thread/`, `home/`, and `sidebar/`. Each feature module follows a strict hierarchy:
1.  **Pages**: Next.js route components that compose features together.
2.  **Features**: The high-level orchestrators (e.g., `ThreadPage.tsx`).
3.  **Components**: Dumb/presentational UI pieces (e.g., `ThreadTurn.tsx`, `CitationBadge.tsx`).
4.  **Hooks**: Custom React hooks handling business logic or API data fetching (e.g., `useThreadPage.ts`).
5.  **API Services**: Strongly typed wrapper functions around native `fetch` for communicating with the backend.

### Backend Architectural Style

The backend follows a **Modular Monolith** architecture. As the application grows, keeping the system unified in a single repository and deployment unit minimizes operational overhead, while strict module boundaries prepare the codebase for future microservice extraction if needed.

#### Core Patterns
We utilize the standard NestJS layered architecture to maintain clear separation of concerns:
1.  **Controllers**: Entry points that handle HTTP requests, validate input via DTOs, and route to the appropriate services.
2.  **Services**: Core business logic. Services coordinate between different domains (e.g., asking the Search Service for context and the AI Service for an answer).
3.  **Repositories/Prisma**: Data access layer responsible for reading and writing to the PostgreSQL database.
4.  **Mappers**: Helper utilities that transform raw database models into the clean API contracts defined in [`API.md`](API.md).



## 2. Data Flow: Asking a Question

The following describes the end-to-end data flow when a user submits a question.

1.  **Input (Frontend)**: User types into the `AskInput` component.
2.  **Submission (Frontend)**: Submitting triggers `POST /perplexity/ask/stream` for progressive rendering, with `POST /perplexity/ask` retained as a synchronous JSON fallback (see [`API.md`](API.md)).
3.  **Routing (Frontend)**: The Next.js router navigates the user to `/thread/[threadId]`.
4.  **Backend Ask Module**: The `AskController` receives the request and passes it to the `AskService`.
5.  **Thread/Turn Creation**: The `AskService` creates a new Thread (if needed) and a new Turn in the database to track the interaction.
6.  **Search Context Generation**: 
    *   The question is passed to the AI provider to rewrite it into an optimized web search query.
    *   The `SearchService` executes the query against Tavily to fetch relevant external sources.
7.  **Source Preparation**: The retrieved web results are normalized into source inputs for answer context and later persistence.
8.  **AI Answer Generation**:
    *   The `AiService` uses the fetched sources as context to stream answer text through the active provider.
    *   The AI Service is provider-agnostic, supporting OpenAI and Groq based on environment variables.
9.  **Streaming Buffer (Backend)**: While answer deltas are emitted to the frontend, the backend buffers the full markdown answer in memory for final persistence. The stream also emits lifecycle progress stages (`preparing`, `searching`, `answering`, `saving`, `completed`) so the UI can show specific status text.
10. **Citation Linking**: After streaming completes, the backend maps markdown citations (e.g., `[1]`) to the persisted sources to construct `citations` objects.
11. **Finalization (Backend)**: The final answer, sources, citations, and suggested follow-up questions are persisted, and the stream emits the same `{ thread, turn }` response shape used by the synchronous endpoint.
12. **Hydration (Frontend)**:
    *   If the ask was a new thread, the initial turn data is passed into React Query's cache.
    *   If the user navigates directly to a URL, `useThreadPage` fetches the full thread via `GET /perplexity/threads/:threadId` (see [`API.md`](API.md)).
13. **Server History (Frontend)**:
    *   The sidebar and `/history` prefer `GET /perplexity/threads` for persisted thread summaries.
    *   Local history remains as an optimistic/offline fallback so newly-created threads appear quickly before the server list reconciles.
14. **Rendering Markdown (Frontend)**: The answer text is passed to `react-markdown`. A custom plugin parses `[n]` citation markers and replaces them with interactive `CitationBadge` React components.
15. **Recovery (Frontend/Backend)**: Failed turns can be retried through `POST /perplexity/ask/retry`. Retry preserves the failed turn and appends a new streamed turn using the failed turn's original question.
16. **Share/Export (Frontend)**: V2 sharing is frontend-only. The client can copy thread URLs, response URLs, Markdown, and plain text without creating public share records.

---

## 3. Future Architectural Considerations

*   **Streaming**: The streaming ask endpoint uses SSE over `fetch()` with a POST body. Provider services yield text deltas, while the Ask service buffers the final response and persists one completed turn after the stream finishes.
*   **Retry Semantics**: Retry appends a new turn instead of mutating a failed turn, preserving the conversation timeline and failure evidence.
*   **Share/Export Scope**: Copy/share actions serialize existing thread and turn data client-side. Public share links, auth-scoped sharing, and downloadable files are deferred.
*   **Authentication Flow**: Future authentication will introduce Guards at the controller level to scope database queries by user ID.
