# Perplexity Clone Backend

This is the backend API for the Perplexity clone, responsible for managing research threads, performing web searches, and generating AI answers with citations. It is built using **NestJS**, **TypeScript**, and **PostgreSQL** (via Prisma).

## Overview

The backend exposes endpoints that allow the frontend to:
* Submit questions and follow-ups.
* Search the web for relevant context (using Tavily).
* Generate answers using AI (OpenAI or Groq) with citation markers.
* Retrieve past threads, turns, and sources.

## V2 Scope

This backend is currently designed for local, single-user development. It does
not enforce authentication, user ownership, rate limits, or billing limits. Do
not expose it as a public multi-user service until those guardrails are added.

## Getting Started

### Prerequisites
* Node.js (v20+)
* PostgreSQL database (e.g., Neon)
* API Keys for Tavily and your chosen AI provider (OpenAI or Groq).

### Installation & Configuration

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
   * `TAVILY_SEARCH_TIMEOUT_MS`: (Optional) Defaults to 6000.

   **AI Provider Configs:**
   * `AI_PROVIDER`: (Optional) Select active provider: `openai` or `groq`. Defaults to `openai`.

   *OpenAI Options:*
   * `OPENAI_API_KEY`: (Required if `AI_PROVIDER` is `openai`)
   * `OPENAI_MODEL`: (Optional) Used for answer generation. Defaults to `gpt-4o-mini`.
   * `OPENAI_UTILITY_MODEL`: (Optional) Used for query rewriting and follow-up suggestions. Defaults to `gpt-4o-mini`.
   * `OPENAI_ANSWER_TIMEOUT_MS`: (Optional) Defaults to 16000.
   * `OPENAI_QUERY_REWRITE_TIMEOUT_MS`: (Optional) Defaults to 6000.
   * `OPENAI_SUGGESTION_TIMEOUT_MS`: (Optional) Defaults to 15000.

   *Groq Options:*
   * `GROQ_API_KEY`: (Required if `AI_PROVIDER` is `groq`)
   * `GROQ_MODEL`: (Optional) Used for answer generation. Defaults to `llama-3.3-70b-versatile`.
   * `GROQ_UTILITY_MODEL`: (Optional) Used for query rewriting. Defaults to `llama-3.1-8b-instant`.
   * `GROQ_ANSWER_TIMEOUT_MS`: (Optional) Defaults to 16000.
   * `GROQ_QUERY_REWRITE_TIMEOUT_MS`: (Optional) Defaults to 6000.
   * `GROQ_SUGGESTION_TIMEOUT_MS`: (Optional) Defaults to 15000.

3. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```

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

## Documentation

Deeper technical documentation is located in the root `_docs/` directory:

* [System Architecture](../_docs/ARCHITECTURE.md): System design, component interaction, and design patterns.
* [Product Roadmap](../_docs/ROADMAP.md): Current development phase and future planned features.
* [API Contracts](../_docs/API.md): Detailed request/response payloads for all endpoints.
