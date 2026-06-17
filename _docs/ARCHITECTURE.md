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
2.  **Submission (Frontend)**: Submitting triggers a `POST /perplexity/ask` request (see [`API.md`](API.md)).
3.  **Routing (Frontend)**: The Next.js router navigates the user to `/search/[threadId]`.
4.  **Backend Ask Module**: The `AskController` receives the request and passes it to the `AskService`.
5.  **Thread/Turn Creation**: The `AskService` creates a new Thread (if needed) and a new Turn in the database to track the interaction.
6.  **Search Context Generation**: 
    *   The question is passed to the AI provider to rewrite it into an optimized web search query.
    *   The `SearchService` executes the query against Tavily to fetch relevant external sources.
7.  **Source Persistence**: The `SourcesService` saves the retrieved web sources into the database, associating them with the current turn.
8.  **AI Answer Generation**:
    *   The `AiService` uses the fetched sources as context to generate an answer.
    *   The AI Service is provider-agnostic, supporting OpenAI and Groq based on environment variables.
9.  **Citation Linking**: As the AI generates the answer with markdown citations (e.g., `[1]`), the backend maps these numbers to the persisted sources to construct `citations` objects.
10. **Finalization (Backend)**: The final answer, sources, and citations are persisted, and the `AskController` returns the mapped response to the frontend.
11. **Hydration (Frontend)**: 
    *   If the ask was a new thread, the initial turn data is passed into React Query's cache.
    *   If the user navigates directly to a URL, `useThreadPage` fetches the full thread via `GET /perplexity/threads/:threadId` (see [`API.md`](API.md)).
12. **Rendering Markdown (Frontend)**: The answer text is passed to `react-markdown`. A custom plugin parses `[n]` citation markers and replaces them with interactive `CitationBadge` React components.

---

## 3. Future Architectural Considerations

*   **Streaming**: The current V1 workflow is synchronous. Transitioning to Server-Sent Events (SSE) will require the AI Service to yield tokens to the controller while simultaneously buffering the full response for database persistence.
*   **Authentication Flow**: Future authentication will introduce Guards at the controller level to scope database queries by user ID.
