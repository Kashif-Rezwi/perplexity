# Technology Stack

[Docs](README.md)

This document captures the technology stack for the Perplexity clone. For structural patterns and data flow, please see the [System Architecture](ARCHITECTURE.md).

## Frontend Technology Stack

| Category | Technology | Why |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Supplies pages, server thread prefetch, and the API proxy. Interactive features use client components. |
| **Language** | TypeScript | Checks code and declared API shapes at compile time. The frontend does not validate response bodies against a runtime schema. |
| **Styling** | Tailwind CSS v4 | Rapid utility-first styling. V4 introduces simplified configuration and CSS-native custom properties. |
| **Server State** | TanStack Query v5 | Handles caching, loading states, and error handling for asynchronous backend data. |
| **UI State** | Zustand | Stores sidebar state and up to 50 persisted local history summaries. Component state holds other UI choices. |
| **Markdown** | `react-markdown` + `remark-gfm` + `rehype-highlight` | Renders Markdown, GFM features, and highlighted code. The local citation plugin creates source badges. |

## Backend Technology Stack

| Category | Technology | Why |
|---|---|---|
| **Framework** | NestJS (Node.js) | Provides strong conventions, out-of-the-box dependency injection, and a robust ecosystem. |
| **Language** | TypeScript | Adds static typing to catch errors at compile-time and improve refactoring safety. |
| **Database** | PostgreSQL; Compose selects version 17 | Stores threads, turns, sources, and citations. `DATABASE_URL` selects a local or managed database; no Neon-specific integration exists. |
| **ORM** | Prisma 6 | Provides the schema, migrations, and typed database client. The repository also uses parameterized SQL for summaries, rename, and pin operations. |
| **Validation** | `class-validator` + `class-transformer` | Define DTO rules and transformations. The global NestJS validation pipe applies them to requests. |
| **AI Framework**| Vercel AI SDK + `@ai-sdk/groq` | Supplies text generation, streamed responses, and structured suggestion output through the Groq adapter. Provider changes require code changes. |
| **Search** | `@tavily/core` | Supplies result URLs, titles, snippets, scores, and optional publication dates. The backend does not fetch each result page directly. |

## Runtime and Verification Tools

- Both applications require Node.js 20.9 or newer. Docker images use Node.js 22 Alpine.
- Backend tests use `node:test` with `ts-node`. Frontend tests use Vitest, with Testing Library and `happy-dom` for DOM hook tests.
- Both applications use ESLint and TypeScript checks. No CI workflow is present in this checkout.
- Docker Compose defines PostgreSQL, a migration job, the backend, and the frontend.

Use the two package files and lockfiles for exact dependency versions.
Defaults for models and timeouts live in [AI constants](../backend/src/ai/ai.constants.ts) and the [search service](../backend/src/search/tavily-search.service.ts).
