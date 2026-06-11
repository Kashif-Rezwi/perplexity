# Frontend Roadmap

Perplexity-inspired AI answer engine frontend, built incrementally on top of the NestJS backend.

---

## Backend at a glance

Four endpoint paths drive the V1 frontend:

- `POST /perplexity/ask` — submit a question (new thread or follow-up), get back a lightweight thread/turn response with the answer and cited-source previews
- `GET /perplexity/threads/:threadId` — reload a full thread with all its turns, sources, and citations
- `GET /perplexity/sources?turnId=...` — load the full source list for the selected turn in the Links tab
- `GET /health` — backend health check

No authentication in V1. Responses are synchronous (non-streaming). Answers are GitHub Flavored Markdown with `[1]`, `[2]` citation markers embedded in the text. Citation hover data comes from the lightweight ask/thread turn payload; the full Links tab source list comes from `/sources?turnId=...`.

---

## Phases

### Phase 1 — Project setup
Scaffold the Next.js app, configure the dev proxy to the backend, set up TypeScript, and establish the folder structure. No visible UI yet.

### Phase 2 — Layout & design system
Build the two-column shell: collapsible sidebar on the left, scrollable content area on the right. Define the color palette, typography, spacing, and animation tokens that everything else will use.

### Phase 3 — Sidebar & thread history
Populate the sidebar with a thread history list. Since there is no backend list endpoint, history is stored locally. Wire up a "New thread" action.

### Phase 4 — Ask input (home page)
Build the home page: a centered, focused question input. Submitting calls `POST /ask`, creates a thread, and navigates to the thread page.

### Phase 5 — Thread page & answer view
Build the core product surface: render the thread title, each turn's question, the AI answer in formatted markdown, and the sources panel. This is where most of the product lives.

### Phase 6 — Citation system
Parse `[n]` markers in the answer markdown and render them as interactive citation badges linked to the corresponding source.

### Phase 7 — Follow-up conversation
Add an ask input at the bottom of the thread page. Submitting sends the question with `threadId`, appends a new turn, and updates the view.

### Phase 8 — Suggested follow-ups
Render the suggested follow-up question chips below the last answer and wire them up to pre-fill and submit the ask input.

### Phase 9 — Loading, error & empty states
Cover every waiting and failure state: ask in-flight skeleton, failed turn message, thread not found page, network error handling, and empty sidebar state.

### Phase 10 — Polish
Micro-animations, responsive mobile layout, keyboard shortcuts, and accessibility pass.

---

Each phase is planned in detail just before we implement it.
