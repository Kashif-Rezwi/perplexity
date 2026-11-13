# Docs

Start with the [project README](../README.md) for the product scope and local setup.
Use the reading order below to understand the application. Each linked document keeps its own subject details.

The [12 November 2026 cross-check](FINDINGS.md#documentation-cross-check--12-november-2026) records current code evidence and verification limits.

## Read in this order

1. **[Project README](../README.md): product and scope.**
   Read the scope, features, and “How It Works” sections. Use “Getting Started” when you want to run the application.

2. **[Architecture](ARCHITECTURE.md): system structure and data flow.**
   Read the frontend and backend patterns, then follow “Data Flow: Asking a Question.”
   This gives you the context for the API and implementation.

3. **[API](API.md): the contract between frontend and backend.**
   Start with ask, ask/stream, retry, thread detail, and sources.
   Read history, management, and health routes when your task needs them.

4. **[Backend README](../backend/README.md): backend setup and operation.**
   Then follow the implementation through the [schema](../backend/prisma/schema.prisma),
   [ask controller](../backend/src/ask/ask.controller.ts), [ask service](../backend/src/ask/ask.service.ts),
   and [thread repository](../backend/src/threads/repositories/threads.repository.ts).
   Trace how one question becomes saved turns, sources, and citations.

5. **[Frontend README](../frontend/README.md): frontend setup and operation.**
   Then follow the [API functions](../frontend/src/lib/api/index.ts),
   [ask hook](../frontend/src/features/home/hooks/useAskSubmit.ts),
   and [thread hook](../frontend/src/features/thread/hooks/useThreadPage.ts).
   Trace request submission, streamed cache updates, and answer display.

6. **[Findings](FINDINGS.md): decisions and known issues.**
   Read “How to read and maintain this file” and the Decision Register first.
   Then read the categories that affect your task. Some findings describe earlier states; read their status and disposition.

7. **[Roadmap](ROADMAP.md): current work and planned features.**
   Read the current phase and Foundation Track before selecting work.
   Treat future capabilities as plans, not as descriptions of current behavior.

Steps 1–5 explain the current application. Steps 6–7 prepare you to change it.

## Use when needed

- **[Design history](DESIGN_HISTORY.md):** Read the recorded product/engineering
  decisions, changes from the notebook, technical trade-offs, contribution scope,
  and the limits of the available historical evidence.
- **[Phase-3 execution plan](PHASE_3_PLAN.md):** Review the scope, microtasks,
  acceptance criteria, and completion evidence for the documentation phase.
- **[Tech stack](TECH_STACK.md):** Look up a library's role and the reason for its use.
  Use package files and lockfiles for installed versions.
- **[Deployment](DEPLOYMENT.md):** Configure Compose or production services, apply migrations, verify SSE, and troubleshoot deployment.
- **[Project setup](../README.md#getting-started) and [checks](../README.md#testing):** Run the application and its existing checks.

For a backend task, focus on steps 2–4. For a frontend task, focus on steps 2–3 and 5.
For either task, read the relevant findings before you change behavior.

## Keep this index useful

- Keep product orientation and quick-start instructions in the project README.
- Keep this page limited to links, reading order, and document purpose.
- Update technical details in the document that owns the subject. Link to that document instead of copying its content.
- Update the relevant docs with code changes. Keep current behavior separate from plans and historical findings.
- Verify feature status against the schema, backend operation, UI caller, and tests. Verify releases separately in the running environment.
- Check diagrams, examples, tables, and finding dispositions together with prose when behavior changes.
- Update links when a document moves. Add new documents here only when they answer a distinct reader need.
