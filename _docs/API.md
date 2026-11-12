# Perplexity API Contracts

[Docs](README.md)

## Conventions and Validation

Paths below are backend paths. Browser requests add `/api`, which Next.js removes before forwarding to the backend.
Application routes have the `/perplexity` prefix. Health routes do not.

Requests use JSON. The global validation pipe transforms DTO fields, trims configured strings, and rejects unknown fields.
Identifiers must be UUIDs. Examples use placeholder identifiers; replace them with real UUIDs before sending requests.
Question text must contain 1–2,000 characters after trimming. `threadId` is optional only on ask requests.

The code defines these contracts. Live providers and the deployed HTTP path require separate runtime verification.

## Errors

Before SSE starts, the exception filter returns normal HTTP errors with this shape:

```json
{
  "statusCode": 400,
  "message": ["question must be longer than or equal to 1 characters"],
  "error": "Bad Request",
  "requestId": "request-identifier",
  "timestamp": "2026-11-12T00:00:00.000Z",
  "path": "/perplexity/ask"
}
```

`message` can be a string or a string array. `error` is optional.
`requestId` can be absent when failure occurs before the request interceptor. Proxy or middleware errors can use a different format.
Unexpected exceptions return `Internal server error`; known HTTP exceptions retain their public messages.
The request interceptor also sets the `X-Request-Id` header.

After SSE starts, HTTP status stays 200. Operation failures use an `error` event followed by `done`.
Search and answer failures set `retryable: true`; completion-stage failures set `retryable: false` with `SAVE_FAILED`.
The browser client represents a stream error as `ApiError(503, ...)`; that is not another HTTP response.

## POST /perplexity/ask

Creates a new thread with one turn, or appends a follow-up turn to an existing
thread, searches the web for context, and generates an AI answer.

The current frontend uses the stream route. This JSON route remains available to other API clients.

Request:

```json
{
  "question": "What changed in Next.js 15?",
  "threadId": "optional-existing-thread-uuid"
}
```

Response:

```json
{
  "thread": {
    "threadId": "uuid",
    "title": "What changed in Next.js 15?",
    "status": "completed",
    "mode": "web",
    "answerPreview": "Short answer preview...",
    "isPinned": false,
    "pinnedAt": null,
    "totalSourceCount": 1,
    "turnCount": 1,
    "createdAt": "2026-06-04T00:00:00.000Z",
    "updatedAt": "2026-06-04T00:00:00.000Z"
  },
  "turn": {
    "turnId": "uuid",
    "question": "What changed in Next.js 15?",
    "searchQuery": "What changed in Next.js 15?",
    "answerMarkdown": "Answer text with a citation. [1]",
    "suggestedFollowUpQuestions": [
      "How does Next.js 15 affect app router projects?",
      "What should I migrate first in Next.js 15?",
      "Which Next.js 15 changes affect caching?"
    ],
    "status": "completed",
    "errorMessage": null,
    "sourceCount": 1,
    "citationCount": 1,
    "citations": [
      {
        "citationId": "uuid",
        "citationNumber": 1,
        "sourceId": "uuid",
        "title": "Source title",
        "domain": "example.com",
        "url": "https://example.com",
        "snippet": "Relevant source snippet...",
        "publishedAt": null
      }
    ],
    "createdAt": "2026-06-04T00:00:00.000Z",
    "completedAt": "2026-06-04T00:00:00.000Z"
  }
}
```

Note: `threadId` is optional. When present, ask appends a new turn to that
thread and uses the last 5 completed prior turns as AI context. For follow-ups,
`searchQuery` may differ from `question` because the backend rewrites contextual
questions into standalone web-search queries before calling the web search provider.
The `citations` array contains lightweight previews only for citation markers (`[n]`) that actually
appear in `answerMarkdown`; sources without a matching marker are not included.
`citationCount` always equals `citations.length` — both reflect the filtered set.
Load the full source list for the returned turn with
`GET /perplexity/sources?turnId=<turnId>`. Suggested follow-up questions are
best-effort; if generation fails or times out, the API returns an empty array.
`thread.totalSourceCount` is the sum of sources across all turns in the thread;
`turn.sourceCount` is the source count for the current turn only.
Query rewrite uses at most 3 recent completed turns and truncated prior answers.
Without completed context, the original question becomes the search query without a rewrite call.
Rewrite failure also uses the original question.

### AI Output Formatting Strategy
- **Markdown Format**: The prompt requests Markdown. The frontend supports GFM, but the backend does not enforce a Markdown format schema.
- **Citation Markers**: Citations are embedded in the text using standard numeric brackets (e.g., `[1]`, `[2]`). The frontend is responsible for detecting these and mapping them to the `citations` array.
- **Streaming Context**: `POST /perplexity/ask` remains the synchronous JSON fallback. New clients can use `POST /perplexity/ask/stream` to render answer text progressively and receive the same final response shape.

## POST /perplexity/ask/stream

Streams a new ask or follow-up ask with Server-Sent Events. The request body is
the same as `POST /perplexity/ask`.

Request:

```json
{
  "question": "What changed in Next.js 15?",
  "threadId": "optional-existing-thread-uuid"
}
```

Response content type:

```txt
text/event-stream
```

Event shapes below show both possible outcomes. A successful stream sends `final`; a failed stream sends `error`.

```txt
event: start
data: {"threadId":"uuid","turnId":"uuid","question":"What changed in Next.js 15?","searchQuery":"What changed in Next.js 15?","mode":"web"}

event: progress
data: {"stage":"searching","message":"Searching the web..."}

event: delta
data: {"text":"Partial answer text"}

event: final
data: {"thread":{...},"turn":{...}}

event: error
data: {"message":"AI answer generation failed","code":"ANSWER_FAILED","retryable":true}

event: done
data: {}
```

Notes:

- Query preparation and optional rewrite finish before the backend creates the pending turn and opens SSE.
- The backend creates the pending turn before emitting `start`.
- `progress` events describe lifecycle stages: `preparing`, `searching`,
  `answering`, `saving`, and `completed`.
- `delta` events contain answer text only; citations and source previews are
  finalized in the `final` event.
- The `final` event uses the exact same `{ thread, turn }` shape as
  `POST /perplexity/ask`.
- The backend persists the final answer, sources, citations, and suggested
  follow-up questions after answer streaming completes.
- The `saving` stage includes suggestion generation. Suggestion failure returns an empty array without failing the answer.
- Stream `error` events use `{ message, code, retryable }`, where `code` is one
  of `SEARCH_FAILED`, `ANSWER_TIMEOUT`, `ANSWER_FAILED`, `SAVE_FAILED`, or
  `ASK_FAILED`.
- Validation errors and missing `threadId` targets return normal HTTP errors
  before the event stream starts.
- Success order: `start`, preparation/search progress, answer progress and deltas, save progress, `final`, completion progress, `done`.
- The frontend rejects a stream that ends without `final` or `error`; `done` alone does not confirm success.

## POST /perplexity/ask/retry

Retries a failed turn by appending a new turn to the same thread and streaming
the new attempt. The failed turn is preserved for auditability and UI context.

Request:

```json
{
  "threadId": "existing-thread-uuid",
  "turnId": "failed-turn-uuid"
}
```

Response:

```txt
text/event-stream
```

Events are identical to `POST /perplexity/ask/stream`. If the target turn does
not exist, does not belong to the thread, or is not failed, the endpoint returns
a normal HTTP error before the event stream starts.
Missing targets return 404. A target that exists but is not failed returns 400.
Retry uses completed context from before the failed turn and appends the attempt at the end of the current thread.


## GET /perplexity/sources

Lists saved sources ordered by `createdAt`, then `id`, both descending.

Query:

```text
limit?: number, 1-50, default 20
cursor?: uuid, pagination cursor from the previous response
turnId?: uuid, filters sources to one ask turn
```

Response:

```json
{
  "items": [
    {
      "sourceId": "uuid",
      "turnId": "uuid",
      "threadId": "uuid",
      "threadTitle": "What changed in Next.js 15?",
      "question": "What changed in Next.js 15?",
      "citationNumber": 1,
      "title": "Source title",
      "url": "https://example.com",
      "domain": "example.com",
      "snippet": "Relevant source snippet...",
      "provider": "tavily",
      "providerScore": 0.95,
      "publishedAt": null,
      "createdAt": "2026-06-04T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Without `turnId`, this route lists sources across the shared database.
The current Links hook requests only the first page per completed turn; it does not follow `nextCursor`.

## GET /perplexity/threads

Lists persisted thread summaries for server-backed sidebar and history views.

Query:

```text
limit?: number, 1-50, default 20
cursor?: uuid, pagination cursor from the previous response
sort?: "newest" | "oldest", default "newest"
mode?: "all" | "web" | "deep-research", default "all"
q?: string, case-insensitive title substring, 120 characters maximum after trimming
excludePinned?: boolean, omits pinned threads when true
```

Response:

```json
{
  "items": [
    {
      "threadId": "uuid",
      "title": "What changed in Next.js 15?",
      "status": "completed",
      "mode": "web",
      "answerPreview": "Short answer preview...",
      "isPinned": false,
      "pinnedAt": null,
      "totalSourceCount": 3,
      "turnCount": 1,
      "createdAt": "2026-06-04T00:00:00.000Z",
      "updatedAt": "2026-06-04T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Note: `mode=deep-research` currently returns an empty list because the
current schema persists `web` threads (`ThreadMode.WEB`). Deep research is
planned for V4. The frontend uses this endpoint as the source of truth
for `/history` and sidebar recents, with local history retained only as an
optimistic/offline fallback.
Results sort by `updatedAt`, then `id`, both in the selected direction.
Cursor pagination does not provide a fixed snapshot while threads change. See BUG-04 in [Findings](FINDINGS.md).

## GET /perplexity/threads/pinned

Lists pinned thread summaries ordered by most recently pinned first. This
endpoint has no current frontend caller. The sidebar groups pinned records
from the first normal thread-list page, so older pins can be absent there.
The secondary sort is `id` descending. The response is an array without a pagination cursor.

Query:

```text
limit?: number, 1-50, default 20
```

Response:

```json
[
  {
    "threadId": "uuid",
    "title": "What changed in Next.js 15?",
    "status": "completed",
    "mode": "web",
    "answerPreview": "Short answer preview...",
    "isPinned": true,
    "pinnedAt": "2026-06-04T00:00:00.000Z",
    "totalSourceCount": 3,
    "turnCount": 1,
    "createdAt": "2026-06-04T00:00:00.000Z",
    "updatedAt": "2026-06-04T00:00:00.000Z"
  }
]
```

## PATCH /perplexity/threads/:threadId

Renames a thread without changing its sort position.

Request:

```json
{
  "title": "Renamed thread title"
}
```

Response:

```json
{
  "threadId": "uuid",
  "title": "Renamed thread title",
  "status": "completed",
  "mode": "web",
  "answerPreview": "Short answer preview...",
  "isPinned": false,
  "pinnedAt": null,
  "totalSourceCount": 3,
  "turnCount": 1,
  "createdAt": "2026-06-04T00:00:00.000Z",
  "updatedAt": "2026-06-04T00:00:00.000Z"
}
```

Note: `title` is trimmed and must be 1-80 characters. Rename intentionally
preserves the thread's existing `updatedAt`, so a rename does not move the row
to the top of a newest-first history list.

## PATCH /perplexity/threads/:threadId/pin

Pins or unpins a thread. Pinning sets `pinnedAt` to the current time; unpinning
sets `pinnedAt` to `null`.
The operation preserves `updatedAt`, so it does not change normal history order.
The request body requires a Boolean `isPinned` value.

Request:

```json
{
  "isPinned": true
}
```

Response:

```json
{
  "threadId": "uuid",
  "title": "What changed in Next.js 15?",
  "status": "completed",
  "mode": "web",
  "answerPreview": "Short answer preview...",
  "isPinned": true,
  "pinnedAt": "2026-06-04T00:00:00.000Z",
  "totalSourceCount": 3,
  "turnCount": 1,
  "createdAt": "2026-06-04T00:00:00.000Z",
  "updatedAt": "2026-06-04T00:00:00.000Z"
}
```

## DELETE /perplexity/threads

Bulk-deletes threads and their associated turns, sources, and citations.

Request:

```json
{
  "threadIds": ["uuid-1", "uuid-2"]
}
```

Response:

```json
{
  "requestedCount": 2,
  "deletedCount": 2
}
```

Note: `threadIds` accepts 1–50 distinct UUIDs after trimming and deduplication.
`requestedCount` counts distinct requested identifiers. Proxies must preserve the JSON DELETE body.
Missing or already-deleted IDs are ignored so bulk delete is idempotent.

## GET /perplexity/threads/:threadId

Loads a full research session with all turns, sources, and citations.
The response has no turn limit or cursor. Turns sort by `createdAt` ascending; source and citation arrays sort by `citationNumber` ascending.
Thread status describes the latest activity, not the success of every turn. A failed latest turn leaves earlier completed answers available.

Response:

```json
{
  "threadId": "uuid",
  "title": "What changed in Next.js 15?",
  "status": "completed",
  "mode": "web",
  "answerPreview": "Short answer preview...",
  "isPinned": false,
  "pinnedAt": null,
  "totalSourceCount": 1,
  "turnCount": 1,
  "createdAt": "2026-06-04T00:00:00.000Z",
  "updatedAt": "2026-06-04T00:00:00.000Z",
  "turns": [
    {
      "turnId": "uuid",
      "question": "What changed in Next.js 15?",
      "searchQuery": "What changed in Next.js 15?",
      "answerMarkdown": "Answer text with citations...",
      "suggestedFollowUpQuestions": [
        "How does Next.js 15 affect app router projects?",
        "What should I migrate first in Next.js 15?",
        "Which Next.js 15 changes affect caching?"
      ],
      "status": "completed",
      "errorMessage": null,
      "sourceCount": 1,
      "citationCount": 1,
      "sources": [
        {
          "sourceId": "uuid",
          "citationNumber": 1,
          "title": "Source title",
          "url": "https://example.com",
          "domain": "example.com",
          "snippet": "Relevant source snippet...",
          "provider": "tavily",
          "providerScore": 0.95,
          "publishedAt": null,
          "createdAt": "2026-06-04T00:00:00.000Z"
        }
      ],
      "citations": [
        {
          "citationId": "uuid",
          "sourceId": "uuid",
          "citationNumber": 1,
          "createdAt": "2026-06-04T00:00:00.000Z"
        }
      ],
      "createdAt": "2026-06-04T00:00:00.000Z",
      "completedAt": "2026-06-04T00:00:00.000Z"
    }
  ]
}
```

## DELETE /perplexity/threads/:threadId

Deletes a thread and all associated turns, sources, and citations.

Response: `204 No Content`

A valid but absent identifier also returns 204. Database cascades remove the child records.

## GET /health

Database-aware readiness check. Returns `200` with the readiness payload when
the backend can reach PostgreSQL, and `503 Service Unavailable` when the
database readiness check fails.

Response:

```json
{
  "status": "ok",
  "checks": {
    "database": "up"
  },
  "timestamp": "2026-06-04T00:00:00.000Z"
}
```

## GET /health/live

Process liveness check that does not touch the database. Use this when you only
need to know whether the process is alive and accepting requests.

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-06-04T00:00:00.000Z"
}
```

## GET /health/ready

Runs the same database-aware readiness check as `GET /health`.
The backend Dockerfile defines `/health/ready` as its health check; Compose uses that image health check for startup ordering.
These routes execute `SELECT 1`. They do not test provider access or migration compatibility.
