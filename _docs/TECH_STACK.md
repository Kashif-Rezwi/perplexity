# Technology Stack

This document captures the technology stack for the Perplexity clone. For structural patterns and data flow, please see the [System Architecture](ARCHITECTURE.md).

## Frontend Technology Stack

| Category | Technology | Why |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | The industry standard React framework. Provides robust routing and SSR. |
| **Language** | TypeScript | Adds static typing to catch UI bugs at compile time and enforces strict API payload contracts. |
| **Styling** | Tailwind CSS v4 | Rapid utility-first styling. V4 introduces simplified configuration and CSS-native custom properties. |
| **Server State** | TanStack Query v5 | Handles caching, loading states, and error handling for asynchronous backend data. |
| **UI State** | Zustand | Minimal, fast, and unopinionated global state management (e.g., sidebar toggles). |
| **Markdown** | `react-markdown` + `remark-gfm` | Safely parses the raw string response from the backend AI into React components with GitHub Flavored Markdown support. |

## Backend Technology Stack

| Category | Technology | Why |
|---|---|---|
| **Framework** | NestJS (Node.js) | Provides strong conventions, out-of-the-box dependency injection, and a robust ecosystem. |
| **Language** | TypeScript | Adds static typing to catch errors at compile-time and improve refactoring safety. |
| **Database** | PostgreSQL + Neon | Rock-solid relational database perfect for strict schemas like threads, turns, and citations. Neon allows for scale-to-zero in development. |
| **ORM** | Prisma | Type-safe database client that greatly speeds up development compared to raw SQL. |
| **Validation** | `class-validator` | Integrates seamlessly with NestJS pipes to automatically validate incoming JSON payloads. |
| **AI Framework**| Vercel AI SDK | Provides a unified, provider-agnostic interface for interacting with LLMs (OpenAI, Groq). |
| **Search** | Tavily | An API specifically designed for AI agents, providing clean, pre-parsed, and highly relevant snippets rather than raw HTML. |
