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
    "link": "/search/uuid",
    "status": "completed",
    "mode": "web",
    "answerPreview": "Short answer preview...",
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
Streaming is intentionally deferred to a later chunk. The `citations` array
contains lightweight previews only for citation markers (`[n]`) that actually
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
- **Streaming Context**: While the API currently returns a full JSON object synchronously, it is designed with an event-streaming transition in mind. The frontend data models should be robust to future NDJSON or Server-Sent Events (SSE) updates.



## GET /perplexity/sources

Lists recent sources ordered by `createdAt` descending.

Query:

```text
limit?: number, 1-50, default 20
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

## GET /perplexity/threads/:threadId

Loads a full research session with all turns, sources, and citations.

Response:

```json
{
  "threadId": "uuid",
  "title": "What changed in Next.js 15?",
  "link": "/search/uuid",
  "status": "completed",
  "mode": "web",
  "answerPreview": "Short answer preview...",
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

## GET /health

Backend health check endpoint to verify server status.

Response:

```json
{
  "status": "ok"
}
```
