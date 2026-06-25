# Perplexity API Contracts

## POST /perplexity/ask

Creates a new thread with one turn, or appends a follow-up turn to an existing
thread, searches the web for context, and generates an AI answer.

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

### AI Output Formatting Strategy
- **Markdown Format**: `answerMarkdown` strictly uses GitHub Flavored Markdown (GFM). The frontend must use a compatible parser to render it.
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

Events:

```txt
event: start
data: {"threadId":"uuid","turnId":"uuid","question":"What changed in Next.js 15?","searchQuery":"What changed in Next.js 15?"}

event: progress
data: {"stage":"searching","message":"Searching the web..."}

event: delta
data: {"text":"Partial answer text"}

event: final
data: {"thread":{...},"turn":{...}}

event: error
data: {"message":"OpenAI answer generation failed","code":"ANSWER_FAILED","retryable":true}

event: done
data: {}
```

Notes:

- The backend creates the pending turn before emitting `start`.
- `progress` events describe lifecycle stages: `preparing`, `searching`,
  `answering`, `saving`, and `completed`.
- `delta` events contain answer text only; citations and source previews are
  finalized in the `final` event.
- The `final` event uses the exact same `{ thread, turn }` shape as
  `POST /perplexity/ask`.
- The backend persists the final answer, sources, citations, and suggested
  follow-up questions after answer streaming completes.
- Stream `error` events use `{ message, code, retryable }`, where `code` is one
  of `SEARCH_FAILED`, `ANSWER_TIMEOUT`, `ANSWER_FAILED`, `SAVE_FAILED`, or
  `ASK_FAILED`.
- Validation errors and missing `threadId` targets return normal HTTP errors
  before the event stream starts.

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


## GET /perplexity/sources

Lists recent sources ordered by `createdAt` descending.

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
      "publishedAt": null,
      "createdAt": "2026-06-04T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

## GET /perplexity/threads

Lists persisted thread summaries for server-backed sidebar and history views.

Query:

```text
limit?: number, 1-50, default 20
cursor?: uuid, pagination cursor from the previous response
sort?: "newest" | "oldest", default "newest"
mode?: "all" | "web" | "deep-research", default "all"
q?: string, trimmed title search
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

Note: `mode=deep-research` currently returns an empty list because V1 only
persists `web` threads. The frontend uses this endpoint as the source of truth
for `/history` and sidebar recents, with local history retained only as an
optimistic/offline fallback.

## GET /perplexity/threads/pinned

Lists pinned thread summaries ordered by most recently pinned first. This
endpoint is used by sidebar/history controls that need a compact pinned list.

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

Note: `threadIds` accepts 1-50 UUIDs. Duplicate IDs are de-duped server-side.
Missing or already-deleted IDs are ignored so bulk delete is idempotent.

## GET /perplexity/threads/:threadId

Loads a full research session with all turns, sources, and citations.

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
  "totalSourceCount": 3,
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

## GET /health

Backend health check endpoint to verify server status.

Response:

```json
{
  "status": "ok"
}
```
