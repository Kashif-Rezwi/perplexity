# Perplexity Clone Backend

This is the backend API for the Perplexity clone, responsible for managing research threads, performing web searches, and generating AI answers with citations. It is built using **NestJS**, **TypeScript**, and **PostgreSQL** (via Prisma).

## Overview

The backend exposes endpoints that allow the frontend to:
* Submit questions and follow-ups.
* Receive answers that the backend creates with Tavily search and Groq.
* Retrieve past threads, turns, and sources.

```text
                     HTTP / SSE Request
                             │
                             ▼
              ┌─────────────────────────────┐
              │   NestJS Controllers / DTO  │
              │   Ask · Threads · Sources   │
              └──────────────┬──────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │       AskService Flow       │
              │  Orchestrates Search & LLM  │
              └───┬─────────────────────┬───┘
                  │                     │
        ┌─────────┴─────────┐ ┌─────────┴─────────┐
        │ TavilySearchService │ │     AiService     │
        │   (Tavily API)    │ │ (Groq / AI SDK)   │
        └─────────┬─────────┘ └─────────┬─────────┘
                  │                     │
                  └──────────┬──────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │     Prisma Persistence      │
              │ Threads · Turns · Sources  │
              │         Citations          │
              └──────────────┬──────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │     PostgreSQL Database     │
              └─────────────────────────────┘
```

## V2 Scope

This backend is currently designed for local, single-user development. It does
not enforce authentication, user ownership, rate limits, or billing limits. Do
not expose it as a public multi-user service until those guardrails are added.

## Getting Started

### Prerequisites
* Node.js 20.9 or newer. The Docker images use Node.js 22 Alpine.
* A reachable PostgreSQL database. Compose selects PostgreSQL 17; Neon is optional.
* API Keys for Tavily and your AI provider (Groq).

### Installation & Configuration

Run these commands from `backend/`.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   *Make sure to configure the required API keys. The following options are available:*

   **Database Configs:**
   * `DATABASE_URL` (Required): PostgreSQL connection string.

   **Web Search Configs:**
   * `TAVILY_API_KEY` (Required): API key for Tavily search.
   * `TAVILY_MAX_RESULTS`: (Optional) Defaults to 5.
   * `TAVILY_SEARCH_DEPTH`: (Optional) Defaults to `basic`.
   * `TAVILY_SEARCH_TIMEOUT_MS`: (Optional) Defaults to 6000.

   **AI Configs:**
   * `AI_PROVIDER_API_KEY`: (Required) API key for the active AI provider (Groq).
   * `AI_DEFAULT_MODEL`: (Optional) Used for answer generation. Defaults to `openai/gpt-oss-120b`.
   * `AI_FAST_MODEL`: (Optional) Used for query rewriting and follow-up suggestions. Defaults to `openai/gpt-oss-20b`.
   * `AI_ANSWER_TIMEOUT_MS`: (Optional) Defaults to 16000.
   * `AI_QUERY_REWRITE_TIMEOUT_MS`: (Optional) Defaults to 6000.
   * `AI_SUGGESTION_TIMEOUT_MS`: (Optional) Defaults to 15000.

   The implementation uses the Groq adapter. Changing providers requires code changes.
   See [Deployment](../_docs/DEPLOYMENT.md#4-environment-variables) for the full runtime configuration.

3. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

   Use `npm run prisma:migrate:deploy` instead in production.

### Running the Application

```bash
# development watch mode
npm run dev

# build
npm run build

# production mode after build
npm run start:prod
```

The server defaults to `http://localhost:8080`. Override it with `PORT` when
needed.

### Testing

Run the backend test suite (node:test with a ts-node glue layer):

```bash
npm test
```

The tests cover ask orchestration and retry semantics, stream failure handling,
AI provider services, Tavily search, source and thread persistence, mappers,
citation parsing, environment validation, and route smoke tests.
Repository tests use mocked database methods. Route smoke tests inspect registered routes; they do not exercise the production HTTP bootstrap.

### Linting

```bash
npm run lint
```

## Documentation

Use [Docs](../_docs/README.md) for the reading order, code entry points, and complete document index.
