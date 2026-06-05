# Tech Stack

This document captures the finalized technology stack for the Perplexity V1 application.

## Architecture

| Area | Decision |
|---|---|
| Architecture style | Modular Monolith |
| Backend pattern | Controller → Service → Repository → Mapper |
| V1 approach | Local-first, non-streaming first, scalable for future versions |

## Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL |
| Database provider | Neon |
| ORM | Prisma |
| Validation | `class-validator` + `class-transformer` |
| Configuration | `@nestjs/config` |
| API documentation | Swagger |

## AI Layer

| Layer | Technology |
|---|---|
| AI SDK | Vercel AI SDK |
| LLM provider | OpenAI APIs |
| Initial response mode | Non-streaming |
| Future response mode | Streaming |

## Search Layer

| Layer | Technology |
|---|---|
| Web search provider | Tavily |
| Search mode | Web search |

## Infrastructure

| Area | Decision |
|---|---|
| Development | Local-first |
| Containerization | Docker later |
| Deployment | To be decided after V1 |
| Authentication | Not required in V1, planned for V2 |

## V1 API Scope

| Endpoint | Purpose |
|---|---|
| `POST /perplexity/ask` | Ask a question and generate an answer using search + LLM |
| `GET /perplexity/recents` | List recent sources |
| `GET /perplexity/threads/:threadId` | Load a full thread with turns, sources, and citations |

## Feature Scope

### V1 - Backend MVP Foundation

Core backend capabilities required to make the first complete product loop work.

| Capability | Purpose |
|---|---|
| PostgreSQL persistence with Prisma | Store threads, turns, sources, and citations |
| Recent sources | Load recently used/retrieved sources for the recents view |
| Thread details | Reload a full research session by `threadId` |
| Non-streaming ask endpoint | Accept a question, run search + LLM, persist the result, and return the final answer |
| Web search with Tavily | Retrieve external source material for answers |
| OpenAI answer generation through Vercel AI SDK | Generate answer markdown from the question and search results |
| Sources | Persist source metadata used to support answers |
| Citations | Connect answer citations back to stored sources |
| Follow-up thread support | Allow additional questions inside an existing thread |

### V2 - API Usability Improvements 

Enhancements that improve client experience once the core backend flow is stable.

| Capability | Purpose |
|---|---|
| Streaming responses | Return answer tokens progressively instead of waiting for full completion |
| Pagination/cursor support | Load large lists such as recents in stable chunks |

### V3 - Deployment Readiness

Operational work needed before the backend is easier to run outside local development.

| Capability | Purpose |
|---|---|
| Dockerized deployment | Package the backend and runtime dependencies consistently |

### V4 - Research Intelligence

Higher-level reasoning features after the basic ask/search/answer loop is reliable.

| Capability | Purpose |
|---|---|
| Deep Research agents | Run multi-step research workflows instead of a single search + answer pass |

### V5 - Productization

Features needed when the product moves beyond a single-user V1 backend.

| Capability | Purpose |
|---|---|
| Authentication | Identify users and protect private research history |
| Multi-user support | Scope threads, sources, and usage to individual users |
| Billing or usage limits | Control cost, rate limits, and paid usage |

### V6 - Architecture Scaling

Only needed when the modular monolith becomes a proven bottleneck.

| Capability | Purpose |
|---|---|
| Microservices | Split specific backend capabilities into separate services when operationally justified |
