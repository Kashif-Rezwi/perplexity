# Perplexity Clone

A full-stack AI answer engine that takes a question, searches the web for current context, and generates an answer with inline citations — inspired by Perplexity. Threads, turns, sources, and citations are persisted so each research session can be revisited, continued, and managed later.

The project is a monorepo: a **NestJS** backend that orchestrates web search and LLM generation, a **Next.js** frontend that renders streamed answers with interactive citation badges, and **PostgreSQL** persistence via Prisma.

## Live Demo

A deployment is available at <https://perplexity-lilac.vercel.app>.

This deployment runs the V2 application as-is. V2 is single-user and has no authentication, user-scoped data, rate limits, or billing guardrails, so the deployment does not limit or isolate usage. Keep this in mind if you share the link.

## V2 Scope

V2 is intended for local, single-user use. It does not include authentication, user-scoped data access, rate limits, billing limits, or public multi-tenant deployment guardrails yet. Those concerns are tracked as later productization work in the roadmap.

## Features

- Ask a question and receive a web-grounded answer with inline `[n]` citation markers that map to real sources.
- Follow-ups: contextual questions are rewritten into standalone search queries using recent thread context.
- Streaming responses over Server-Sent Events with lifecycle progress (`preparing`, `searching`, `answering`, `saving`, `completed`).
- Retry failed turns by appending a new attempt instead of mutating the original, preserving the conversation timeline.
- Server-backed history with search, type filter, sort, and cursor pagination; local history acts as an optimistic/offline fallback.
- Thread management: rename, delete, bulk delete, and pin/unpin.
- Citation badges with hover/focus tooltips, a Sources (Links) tab, and copy/export of thread URLs, Markdown, and plain text.
- Operational defaults: non-root containers, health checks, strict response headers, startup environment validation, and explicit (non-wildcard) CORS.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Frontend state | TanStack Query v5 (server data), Zustand (UI/local history), `react-markdown` + `remark-gfm` + `rehype-highlight` |
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL 17, Prisma 6 (threads, turns, sources, citations) |
| AI | Vercel AI SDK — provider-agnostic behind generic `AI_*` config (Groq) |
| Search | Tavily |
| Infrastructure | Docker (multi-stage, non-root), Docker Compose |

## Architecture

The backend is a modular monolith: NestJS controllers validate input (DTOs), services coordinate business logic (the ask pipeline and thread management), and Prisma repositories persist data. The frontend uses a feature-based modular layout under `src/features/` with one typed API client in `src/lib/api`.

```text
┌──────────────────────────────┐
│           Browser            │
│ Next.js 16 (server-rendered) │
│ React 19 · Tailwind CSS v4   │
└──────────────┬───────────────┘
               │ HTTPS /api/* proxy
               ▼
┌──────────────────────────────┐
│        NestJS backend        │
│  Ask · Threads · Sources     │
└──────────────┬───────────────┘
               ▼
┌────────────┐ ┌────────────────┐
│ PostgreSQL │ │Tavily · Groq   │
│ 17 + Prisma│ │ (AI API)       │
└────────────┘ └────────────────┘
```

## How It Works

1. You submit a question. If it is a follow-up, the AI provider first rewrites it into a standalone search query using recent thread context.
2. The backend creates a pending turn, searches Tavily, and streams the LLM answer back token by token while buffering the full Markdown.
3. After streaming, the backend matches `[n]` markers to sources, persists the turn, sources, citations, and suggested follow-ups, and emits a final event.
4. The frontend hydrates its React Query cache so the thread page renders immediately; the sidebar and history reconcile with `GET /perplexity/threads`.

See [`_docs/ARCHITECTURE.md`](_docs/ARCHITECTURE.md) for the full data-flow walkthrough.

## Project Structure

```text
backend/
├── prisma/schema.prisma      # Thread, Turn, Source, Citation models
├── src/ask/                  # Ask/retry endpoints, SSE streaming, citation linking
├── src/ai/                   # Provider-agnostic AI service (Groq), prompts
├── src/search/               # Tavily search integration
├── src/threads/              # Thread list/detail/rename/delete/pin + turn persistence
├── src/sources/              # Source listing endpoint
├── src/common/               # Exception filter, request logging, utilities
└── test/                     # node:test + ts-node tests
frontend/
├── src/app/                  # Next.js App Router pages
├── src/features/             # home, thread, history, sidebar, thread-management
├── src/lib/api/              # Typed API client + SSE parser
├── src/store/                # Zustand history store
└── src/types/                # Shared API payload types
```

## Getting Started

### Prerequisites

- Node.js 20.9 or newer (Docker images use Node 22 Alpine)
- API keys: Tavily and Groq (`AI_PROVIDER_API_KEY`)
- Docker (for the Compose workflow) or a local PostgreSQL 17 instance

### Quick start with Docker Compose

For a production-shaped local stack:

```bash
cp .env.example .env
# Replace every placeholder in .env (POSTGRES_PASSWORD, TAVILY_API_KEY,
# AI_PROVIDER_API_KEY), then:
docker compose up -d --build
docker compose ps -a
```

Open `http://localhost:3001`. The stack runs the database, migrations, backend, and frontend with health checks. See the **[Deployment Guide](_docs/DEPLOYMENT.md)** for configuration, secret handling, and end-to-end verification.

### Run services directly

To run the application locally, start both servers.

**Backend** (http://localhost:8080):

```bash
cd backend
cp .env.example .env      # add DATABASE_URL, Tavily key, and provider key
npm install
npm run prisma:migrate
npm run dev
```

**Frontend** (http://localhost:3001, proxies `/api/*` to the backend):

```bash
cd frontend
npm install
npm run dev
```

Enter a question in the prompt input on the home page, and the frontend will communicate with the backend to retrieve context and generate an AI-powered response.

## Environment Variables

| File | Purpose |
| --- | --- |
| `.env.example` (root) | Compose variables: Postgres credentials, runtime flags, provider/search keys |
| `backend/.env.example` | Full backend reference: `DATABASE_URL`, `TAVILY_*`, `AI_*` models and timeouts |
| `frontend/.env.example` | Server-only `BACKEND_URL` used by the Next.js `/api` proxy |

The backend validates its environment at startup and names any missing or malformed value. Placeholder keys in the example files do not provide working external service access; real credentials belong in your local, git-ignored `.env` files.

## Testing

```bash
# Backend — node:test + ts-node (18 test files: ask orchestration, AI
# providers, search, sources, threads, citations, environment, routes)
cd backend && npm test

# Frontend — Vitest (14 test files: hooks, stores, SSE parser, markdown
# citations, thread export, history/sidebar utilities)
cd frontend && npm test

# Linting
cd backend && npm run lint
cd frontend && npm run lint
```

There is no CI pipeline in this repository yet; the commands above can be wired into one.

## API Overview

All application endpoints are scoped under `/perplexity`; full contracts live in [`_docs/API.md`](_docs/API.md).

- `POST /perplexity/ask` — synchronous ask (JSON fallback)
- `POST /perplexity/ask/stream` — streamed ask (SSE)
- `POST /perplexity/ask/retry` — retry a failed turn (SSE)
- `GET /perplexity/threads` · `GET /perplexity/threads/pinned` · `GET /perplexity/threads/:threadId`
- `PATCH /perplexity/threads/:threadId` · `PATCH /perplexity/threads/:threadId/pin`
- `DELETE /perplexity/threads` · `DELETE /perplexity/threads/:threadId`
- `GET /perplexity/sources?turnId=…`
- `GET /health` · `GET /health/live` · `GET /health/ready`

## Deployment

- `compose.yaml` provides a production-shaped local stack.
- [`_docs/DEPLOYMENT.md`](_docs/DEPLOYMENT.md) covers independent service deployment, migrations, secret management, proxy/SSE buffering guidance, and verification. The frontend's `/api/*` proxy keeps provider and database keys out of the browser.
- A live deployment currently runs on Vercel (see Live Demo above). Because V2 has no authentication or rate limits, do not expose the backend directly to the public internet without the gateway controls described in the guide.

## Roadmap

Current phase: **V2 — Usability Improvements**. V3 through V6 track deployment guardrails, deep-research agents, authentication and billing, and eventual service extraction. See [`_docs/ROADMAP.md`](_docs/ROADMAP.md).

## Contributing

The repository uses a feature-branch workflow: topic branches (for example `v2`, `refactor`) are merged into `develop`, and `main` tracks released state. Pull requests should keep that shape, include focused tests, and avoid strengthening the claims in this README beyond what the code demonstrates.

## License

No license file is present, and the repository does not grant an implicit open-source license. `backend/package.json` still declares `ISC`; this metadata should be reconciled with a maintainer decision (add a `LICENSE` file or remove the declaration).
