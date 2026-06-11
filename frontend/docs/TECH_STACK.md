# Tech Stack

This document captures the finalized technology stack for the Perplexity V1 frontend.

## Architecture

| Area | Decision |
|---|---|
| Architecture style | Feature-based modular structure |
| Frontend pattern | Page → Feature → Component → Hook → API service |
| V1 approach | Client-rendered, non-streaming, incremental by phase |

## Core

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Runtime | Node.js |

## UI

| Layer | Technology |
|---|---|
| Styling | Tailwind CSS |
| Design tokens | CSS custom properties (colors, spacing, type, animation) |
| Typography | Inter via `next/font/google` |
| Icons | Lucide React or Radix Icons |

## State & Data

| Layer | Technology |
|---|---|
| Server state (caching, loading, errors) | TanStack Query (React Query v5) |
| UI state (sidebar, overlays) | React Context or Zustand |
| URL state (active thread) | Next.js App Router params |
| Thread history (no backend list endpoint) | `localStorage` |

## API Layer

| Layer | Technology |
|---|---|
| HTTP client | Native `fetch` wrapped in typed service functions |
| Dev proxy (avoids CORS) | Next.js `rewrites` in `next.config.ts` |
| Type safety | TypeScript types mirroring backend response shapes |
| Ask response contract | Lightweight thread/turn response with citation previews only |
| Source loading contract | Full turn sources loaded via `GET /perplexity/sources?turnId=...` |

## Markdown & Citations

| Layer | Technology |
|---|---|
| Markdown parser | `react-markdown` |
| GFM support | `remark-gfm` |
| Syntax highlighting | `rehype-highlight` |
| Citation injection | Custom renderer replacing `[n]` markers with React components |

## Infrastructure

| Area | Decision |
|---|---|
| Development | Local-first, runs alongside backend on separate port |
| Deployment | To be decided after V1 |
| Authentication | Not required in V1 |

## V1 Feature Scope

| Feature | Included |
|---|---|
| Home page ask input | ✅ |
| Thread page with answer view | ✅ |
| GFM markdown rendering | ✅ |
| Citation badge system | ✅ |
| Sources panel per turn | ✅ |
| Follow-up conversation | ✅ |
| Suggested follow-up chips | ✅ |
| Sidebar with local thread history | ✅ |
| Loading, error, and empty states | ✅ |
| Responsive layout | ✅ |
| Streaming answer rendering | ❌ V2 (backend not yet streaming) |
| Authentication | ❌ V5 backend feature |
| Thread list from backend | ❌ No endpoint in V1 |
| Thread delete / rename | ❌ No endpoint in V1 |
| Dark / light mode toggle | ❌ Dark by default in V1 |
