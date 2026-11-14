# Backend and database

[Docs](../README.md) · [Architecture](../ARCHITECTURE.md) · [API contracts](../API.md)

My notes on how the backend works, how data is stored, and why the pieces are
split this way. I'm keeping the files, request flows, and reasons together so I
can come back to them while working on the app.

[Database model](DATABASE_MODEL.md) covers the four main tables.
[Design history](../DESIGN_HISTORY.md) keeps the earlier decisions.
All diagrams here use plain ASCII.

## 1. Database model and backend setup

Every backend feature uses the same tables and database connection. The schema
describes the data, migrations apply changes to PostgreSQL, and the database
service gives the rest of the app access to Prisma Client.

- **Data model:** [schema](../../backend/prisma/schema.prisma),
  [query and record types](../../backend/src/threads/types/threads.types.ts), and
  [initial SQL](../../backend/prisma/migrations/20260604090000_init/migration.sql).
- **Connection and startup:** [environment example](../../backend/.env.example),
  [environment validation](../../backend/src/config/environment.ts),
  [bootstrap](../../backend/src/main.ts), [root module](../../backend/src/app.module.ts),
  [database module](../../backend/src/database/database.module.ts),
  [database service](../../backend/src/database/database.service.ts), and
  [health controller](../../backend/src/health.controller.ts).
- **Database commands:** [package scripts](../../backend/package.json) and
  [Prisma CLI config](../../backend/prisma.config.ts) define generation and migration setup.
- **Database writes:** [thread service](../../backend/src/threads/threads.service.ts)
  passes work to the [repository](../../backend/src/threads/repositories/threads.repository.ts).
  The main methods are `createThreadWithPendingTurn`, `completeTurn`, and `failTurn`.

Tests: [environment](../../backend/test/environment.test.js),
[health](../../backend/test/health.controller.test.js), and
[repository](../../backend/test/threads.repository.test.js).
These use sample inputs and a mocked database. Real PostgreSQL tests are separate.

## 2. Asking a new question

The ask service brings the main pieces together: prepare the question, search,
generate an answer, save it, and return the saved result.

```text
ask -> preparePendingAsk -> searchSources -> generateAnswer -> completeAskTurn
```

- **Request entry:** [ask module](../../backend/src/ask/ask.module.ts),
  [request DTO](../../backend/src/ask/dto/ask-request.dto.ts), and
  [controller](../../backend/src/ask/ask.controller.ts).
- **Main flow:** [ask service](../../backend/src/ask/ask.service.ts) and
  [input/output types](../../backend/src/ask/types/ask.types.ts).
- **Response details:** [title and preview helpers](../../backend/src/ask/utils/ask-text.util.ts)
  and [response mapper](../../backend/src/ask/mappers/ask-response.mapper.ts).

The JSON route returns one completed response. The browser uses the streaming
route, which sends progress and answer text as the work happens.

Tests: [ask flow](../../backend/test/ask.service.test.js),
[previews](../../backend/test/ask-preview.service.test.js),
[response mapping](../../backend/test/ask-response.mapper.test.js), and
[shared test data and mocks](../../backend/test/ask-test-helpers.js).

## 3. Web search and AI generation

Search supplies the evidence; AI uses it to write the answer. Keeping these
calls in their own services keeps provider settings, prompts, timeouts, and
response handling out of the request controller.

- **Search:** [search module](../../backend/src/search/search.module.ts),
  [Tavily service](../../backend/src/search/tavily-search.service.ts),
  [search types](../../backend/src/search/types/search.types.ts), and
  [search-to-source mapper](../../backend/src/ask/mappers/search-to-source.mapper.ts).
- **AI calls:** [AI module](../../backend/src/ai/ai.module.ts),
  [AI service](../../backend/src/ai/ai.service.ts),
  [constants](../../backend/src/ai/ai.constants.ts),
  [prompts](../../backend/src/ai/prompts/ai-prompts.ts),
  [types](../../backend/src/ai/types/ai.types.ts),
  [SDK helper](../../backend/src/ai/utils/ai-sdk.util.ts), and
  [output parsing](../../backend/src/ai/utils/ai-output.util.ts).
- **Shared helpers:** [configuration values](../../backend/src/common/utils/config.util.ts)
  and [timeouts](../../backend/src/common/utils/with-timeout.util.ts).

Tests: [search](../../backend/test/tavily-search.service.test.js),
[AI service](../../backend/test/ai.service.test.js),
[SDK handling](../../backend/test/ai-sdk.util.test.js), and
[timeouts](../../backend/test/with-timeout.test.js).
Actual search and AI responses need separate live checks.

## 4. Sources, citations, and saving the answer

A retrieved result is not always cited. Sources keep the search results;
citations connect numbers such as `[1]` in the answer to the right saved Source.
A saved reference tells me where the number points, but does not prove the
source supports the answer's claim.

- **Source data:** [source input types](../../backend/src/sources/types/sources.types.ts)
  and [search mapper](../../backend/src/ask/mappers/search-to-source.mapper.ts).
- **Answer references:** [citation parser](../../backend/src/ask/parsers/citation-marker.parser.ts)
  and [citation preparation](../../backend/src/ask/helpers/answer-citation.helper.ts).
- **Saving:** `completeAskTurn` calls `ThreadsService.completeTurn`, which passes
  the work to the repository's `completeTurn`. Its `createTurnSources` and
  `createTurnCitations` methods save the related records.

Tests: [citations](../../backend/test/citations.test.js) and the repository tests.

## 5. Follow-up questions and conversation context

A short follow-up may depend on an earlier answer. The app keeps the user's
question, but can rewrite the search query to make that context clear.

- **Context selection:** [context helper](../../backend/src/ask/helpers/ask-thread-context.helper.ts)
  and `preparePendingAsk`.
- **Search query and suggestions:** `resolveSearchQuery`, the AI prompts, and
  `generateSuggestedFollowUpQuestions` in the AI service.

The answer uses up to five completed prior turns. Query rewriting uses up to
three prior turns with shortened answers. Suggestions are optional: if their
request fails, the answer can still succeed with no suggested questions.

Tests: [follow-ups](../../backend/test/ask-follow-up.service.test.js) and the AI
service tests.

## 6. Streaming, cancellation, errors, and retry

Streaming sends progress and answer text before the final saved result is ready.
The controller writes events to the response; the service produces those events
while it runs the ask flow.

- **HTTP stream:** `askStream`, `retryAskStream`, `writeSseEvents`, and
  `bindSseAbort` in the ask controller.
- **Stream flow and retry:** `createAskStream`, `preparePendingRetryAsk`, and
  failure handling in the ask service.
- **Request and event shapes:** [retry DTO](../../backend/src/ask/dto/retry-ask-request.dto.ts)
  and [event types](../../backend/src/ask/types/ask-stream.types.ts).
- **Provider errors:** `fullStream` handling in the AI SDK helper.

Retry adds a new attempt and keeps the failed Turn. Overlapping requests and
interrupted attempts still need care; their current limits are recorded in
[Architecture](../ARCHITECTURE.md#status-recovery-and-current-limits).

Tests: [ask failures](../../backend/test/ask-failure.service.test.js),
[provider stream errors](../../backend/test/ask-stream-provider-error.test.js),
and the SDK tests.

## 7. Saved-conversation APIs

History, thread details, and source lists read saved data. Rename, pin, and
delete change it. These features share files, but use different queries.

- **Thread reads:** [threads module](../../backend/src/threads/threads.module.ts),
  [controller](../../backend/src/threads/threads.controller.ts), thread service
  and repository, [thread mapper](../../backend/src/threads/mappers/thread-response.mapper.ts),
  [list DTO](../../backend/src/threads/dto/thread-list-query.dto.ts), and
  [pinned-list DTO](../../backend/src/threads/dto/pinned-thread-list-query.dto.ts).
- **Source reads:** [sources module](../../backend/src/sources/sources.module.ts),
  [controller](../../backend/src/sources/sources.controller.ts),
  [service](../../backend/src/sources/sources.service.ts),
  [repository](../../backend/src/sources/repositories/sources.repository.ts),
  [query DTO](../../backend/src/sources/dto/sources-query.dto.ts), and
  [source mapper](../../backend/src/sources/mappers/source-response.mapper.ts).
- **Thread changes:** [rename DTO](../../backend/src/threads/dto/rename-thread.dto.ts),
  [pin DTO](../../backend/src/threads/dto/toggle-pin.dto.ts),
  [bulk-delete DTO](../../backend/src/threads/dto/bulk-delete-threads.dto.ts),
  and their controller, service, and repository methods.

Rename and pin preserve the conversation's activity time. Deleting an already
missing thread is allowed. Database deletion rules remove related records when
a Thread is deleted.

Tests: [thread DTOs](../../backend/test/threads.dto.test.js),
[thread service](../../backend/test/threads.service.test.js), repository tests,
and [source service](../../backend/test/sources.service.test.js).

## 8. HTTP behavior and running the app

Validation decides which requests the app accepts. Error handling and logging
make failures visible. Health checks and deployment settings connect the code
to the running service.

- **Server setup:** bootstrap, environment validation, and health checks.
- **HTTP behavior:** [exception filter](../../backend/src/common/http/global-exception.filter.ts),
  [logging interceptor](../../backend/src/common/http/request-logging.interceptor.ts),
  and [error helper](../../backend/src/common/utils/error.util.ts).
- **Running the app:** [backend Dockerfile](../../backend/Dockerfile) and
  [deployment notes](../DEPLOYMENT.md).

[Route smoke tests](../../backend/test/routes.smoke.test.js) check route
declarations, not requests through a running server. Real database tests, full
HTTP/browser flows, CI, container builds, and deployed streaming checks remain
in [Findings](../FINDINGS.md).
