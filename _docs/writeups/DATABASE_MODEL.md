# Database model

[Backend and database](BACKEND_AND_DATABASE.md) · [Architecture](../ARCHITECTURE.md)

My notes on the four tables, how they connect, and why I keep their
responsibilities separate.

## What I need to store

A conversation can contain several questions and answers. Each answer needs its
own search results, source references, and status. Keeping these separately lets
me reopen a conversation, add a follow-up, or see which attempt failed.

The four models are:

- **Thread:** the conversation and its short history-list summary.
- **Turn:** one question and answer attempt inside that conversation.
- **Source:** a search result saved for that attempt.
- **Citation:** a link between a source number used in the answer and a saved Source.

These are also the models in my [original notebook notes](../DESIGN_HISTORY.md#img_1093--server-setup-and-domain-model).

## Files and their roles

1. [schema.prisma](../../backend/prisma/schema.prisma) defines the current tables,
   fields, relationships, defaults, and rules.
2. [Initial migration](../../backend/prisma/migrations/20260604090000_init/migration.sql)
   shows the SQL that created the tables. Later migrations changed some fields
   and defaults, so this first migration alone is not today's full schema.
3. [threads.types.ts](../../backend/src/threads/types/threads.types.ts) describes
   the data passed into writes, loaded from queries, and returned by the API.
   The `include` objects choose which related records Prisma loads. Types help
   TypeScript check the code; they do not validate incoming HTTP requests.
   `ThreadHeaderRecord` reuses `ThreadListBaseRecord` so the shared response
   mapper uses the same shape as the thread query.
4. [threads.repository.ts](../../backend/src/threads/repositories/threads.repository.ts)
   contains the database queries. `createThreadWithPendingTurn`, `completeTurn`,
   and `failTurn` handle the attempt's initial, successful, and failed states.

The [citation parser](../../backend/src/ask/parsers/citation-marker.parser.ts),
[repository tests](../../backend/test/threads.repository.test.js), and
[citation tests](../../backend/test/citations.test.js) show how records are saved and citation numbers are handled.

## How the models connect

```text
                +-----------------------+
                | Thread                |
                | One conversation      |
                +-----------+-----------+
                            |
                            | contains 0 or more
                            v
                +-----------------------+
                | Turn                  |
                | One answer attempt    |
                +-----------+-----------+
                            |
            +---------------+---------------+
            |                               |
            v                               v
+-----------------------+       +-----------------------+
| Source                |<------| Citation              |
| One saved result      |       | A used source number  |
+-----------------------+       +-----------------------+
```

A Thread can have several Turns. Each Turn can have several Sources and
Citations. A new Turn may have none yet. Each Citation points to one Source
through `sourceId`; the left-pointing arrow shows that reference.

This shows the relationships, not the order in which the code runs. The schema
allows a Source to have several Citation records, but the current write flow
saves one mapping per used source number in a turn.

## Thread - the conversation

`id` identifies the conversation. `title` and `answerPreview` give the history
list enough information to display a short summary without loading every answer.
`isPinned` and `pinnedAt` support pinning. `createdAt` and `updatedAt` support
history ordering. The only stored mode right now is `WEB`.

The summary needs to stay in sync with the latest turn. When an older turn
finishes, the repository avoids replacing the newer turn's summary. This check
alone does not prevent two requests from running at the same time.

Thread status starts as `RUNNING` and describes the latest activity. A failed
latest attempt can exist alongside older successful answers. This is the
[status decision already recorded](../DESIGN_HISTORY.md#keep-thread-status-as-latest-activity).

`turns Turn[]` is how Prisma represents the relationship. PostgreSQL does not
store an array of Turn rows in Thread; it connects them through `Turn.threadId`.

## Turn - one question and answer attempt

Separating Turn from Thread keeps each question, answer, and failure in its own
record. A follow-up adds a Turn to the same Thread. A retry also adds a new Turn,
so the failed attempt stays available.

The main fields are:

- `question`: what the user asked.
- `searchQuery`: what the app used to search the web.
- `answerMarkdown`: the saved answer; it can be `null` before an answer is saved.
- `suggestedFollowUpQuestions`: suggested next questions, stored as a string list.
- `status`: whether the attempt is pending, completed, or failed.
- `errorMessage`: the failure message saved when an attempt fails.
- `completedAt`: when the attempt finished. The code sets it on failure too.

Keeping `question` and `searchQuery` separate matters for follow-ups. The user
may ask "What about its pricing?", while search needs a fuller question naming
the product. I can keep the user's words and still search with a clearer query.

## Source - a saved search result

A Source stores the result's title, URL, domain, and snippet. `provider` records
where it came from. `providerScore` and `publishedAt` can be `null` when unavailable.
`citationNumber` gives the result its number within that turn.

Sources belong to a Turn because each question can return different results.
The same URL can appear in several turns, with different snippets or metadata.
This stores search-result details, not a full copy of the web page.

`@@unique([turnId, citationNumber])` means one turn cannot have two Sources
numbered 1. Another turn can have its own Source 1.

## Citation - a source number used in the answer

Retrieving a result does not mean the answer uses it. Source keeps what was
retrieved; Citation keeps the reference actually used in the answer.

`turnId`, `sourceId`, and `citationNumber` connect an answer's `[1]` to its saved
Source. The parser collects each used number once, so repeating `[1]` does not
create another Citation row. Citation also has a unique rule on
`(turnId, citationNumber)` to prevent duplicate mappings within a turn.

A citation tells me where a reference points. It does not prove the source
supports the answer's claim.

The database checks that the referenced Turn and
Source exist. It does not separately check that their turn IDs and source numbers
match. The write code keeps them aligned by looking up Source IDs created for
that same turn.

## Following one question through the database

For example, a question retrieves two sources and the answer uses only `[1]`:

1. The ask service resolves the search query, then creates a Thread with its
   first `PENDING` Turn in one nested write.
2. Search and answer generation run while that pending Turn already exists.
3. Once the answer is ready, `completeTurn` checks that the Turn belongs to the
   Thread. It saves both Sources, saves one Citation for Source 1, marks the Turn
   `COMPLETED`, and updates the Thread summary if this is its latest Turn.
4. A follow-up adds another Turn. Its source numbering can start at 1 again.

After the first answer, this example has one Thread, one Turn, two Sources,
and one Citation.

The completion writes use a transaction so they all save or all roll back
if something fails. Search and AI calls run outside it. The earlier pending Turn
is also outside this transaction, so it still needs failure handling.

## Database rules and implementation details

- **Deleting a Thread:** `ON DELETE CASCADE` removes its Turns and their Sources
  and Citations too. It handles related-record cleanup; access checks are separate.
- **Unique rule versus index:** a unique rule prevents duplicates. A normal index
  helps queries find or order records and does not prevent duplicates.
- **Text fields:** plain `String` fields use PostgreSQL `text` by default.
  I keep explicit types where they matter, such as UUIDs, title length, and
  timestamp precision.
- **History indexes:** `(updatedAt, id)` matches history ordering;
  `(isPinned, pinnedAt, id)` supports pinned lists.
- **Source indexes:** `(createdAt, id)` and `(turnId, createdAt, id)` support
  source lists across all turns or within one turn. These declarations alone
  do not tell me how fast the queries run.
- **`@updatedAt`:** Prisma manages this field. Rename and pin use SQL that leaves
  it unchanged, so those actions do not change the conversation's activity time.
- **UUIDs:** `@default(uuid())` in Prisma does not mean the initial SQL defines
  a PostgreSQL UUID default. The migration has plain UUID columns.
- **Two kinds of lists:** `turns Turn[]` is a relationship. In contrast,
  `suggestedFollowUpQuestions String[]` is a PostgreSQL text-array column.
- **Current scope:** the schema has no User model, billing records, or Deep
  Research mode yet.

The existing repository tests use a mocked database. They help check the code's
queries, but real PostgreSQL behavior still needs the Phase 4 integration tests.

## Schema changes

- [Initial schema](../../backend/prisma/migrations/20260604090000_init/migration.sql):
  creates the tables, relationships, and initial indexes. Thread originally
  defaulted to `COMPLETED` here.
- [Suggestions](../../backend/prisma/migrations/20260606090000_add_turn_suggested_follow_up_questions/migration.sql):
  adds `suggestedFollowUpQuestions`.
- [Status and title](../../backend/prisma/migrations/20260607021805_harden_thread_status_default_and_title_length/migration.sql):
  changes the Thread default to `RUNNING` and limits the title to 80 characters.
- [Pinning](../../backend/prisma/migrations/20260619195352_add_thread_pinning/migration.sql):
  adds pin fields and history indexes.
- [Source pagination](../../backend/prisma/migrations/20260624090000_add_source_pagination_indexes/migration.sql):
  adds indexes for source-list ordering.

References: [Prisma 6 relationships and deletion rules](https://www.prisma.io/docs/orm/v6/prisma-schema/data-model/relations/referential-actions)
and [Prisma 6 indexes](https://www.prisma.io/docs/orm/v6/prisma-schema/data-model/indexes).
