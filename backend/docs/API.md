# Perplexity API Contracts

## POST /perplexity/ask

Creates a new thread with one turn and generates an AI answer.

Request:

```json
{
  "question": "What changed in Next.js 15?",
  // "threadId": "optional-existing-thread-uuid",
  // "mode": "web"
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
    "sourceCount": 0,
    "turnCount": 1,
    "createdAt": "2026-06-04T00:00:00.000Z",
    "updatedAt": "2026-06-04T00:00:00.000Z"
  },
  "turn": {
    "turnId": "uuid",
    "question": "What changed in Next.js 15?",
    "searchQuery": "What changed in Next.js 15?",
    "answerMarkdown": "Answer text...",
    "status": "completed",
    "errorMessage": null,
    "sources": [],
    "citations": [],
    "createdAt": "2026-06-04T00:00:00.000Z",
    "completedAt": "2026-06-04T00:00:00.000Z"
  }
}
```

Note: web search, source persistence, citations, follow-up context, and
streaming are intentionally deferred to later chunks.

## GET /perplexity/recents

Lists recent sources ordered by `createdAt` descending.

Query:

```text
limit?: number, 1-50, default 20
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
      "link": "/search/uuid",
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
  "sourceCount": 3,
  "turnCount": 1,
  "createdAt": "2026-06-04T00:00:00.000Z",
  "updatedAt": "2026-06-04T00:00:00.000Z",
  "turns": [
    {
      "turnId": "uuid",
      "question": "What changed in Next.js 15?",
      "searchQuery": "What changed in Next.js 15?",
      "answerMarkdown": "Answer text with citations...",
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
