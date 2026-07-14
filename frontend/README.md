# Perplexity Clone Frontend

This is the frontend user interface for the Perplexity clone, responsible for the dynamic UI, Markdown formatting, citation management, and communicating with the backend API. It is built with **Next.js**, **React**, **Tailwind CSS**, and **TypeScript**.

## Overview

The frontend handles:
* A two-column responsive layout (Sidebar for history, Main view for current thread).
* Submission of initial questions and continuous follow-ups.
* Rendering of complex AI answers using GitHub Flavored Markdown (GFM).
* A custom citation system that maps inline markers (e.g., `[1]`) to interactive badges and source panels.

Note: source favicons are loaded from Google's public favicon service. This is
simple for V2 local use, but a production deployment should consider a
first-party proxy/cache if privacy or CSP requirements demand it.

## Getting Started

### Prerequisites
* Node.js (v20+)
* A running instance of the Perplexity Backend (defaults to `http://localhost:8080`).

### Installation & Configuration

1. Install dependencies:
   ```bash
   npm install
   ```

2. The frontend is configured to automatically proxy requests via Next.js `rewrites` to avoid CORS issues. If your backend is running on a different port, set `BACKEND_URL` before starting the frontend.

   `BACKEND_URL` is server-only. Set the same value during `next build` and on
   the running server for SSR; rebuild the production frontend whenever it
   changes.

### Running the Application

Start the development server:

```bash
npm run dev
```

The development and production start scripts both serve the app on
[http://localhost:3001](http://localhost:3001).

## Documentation

Deeper technical documentation is located in the root `_docs/` directory:

* [System Architecture](../_docs/ARCHITECTURE.md): Frontend structure, backend interaction, and state management.
* [Product Roadmap](../_docs/ROADMAP.md): Current development phase and future planned features.
* [API Contracts](../_docs/API.md): API definitions for backend communication.
* [Deployment Guide](../_docs/DEPLOYMENT.md): Docker images, proxy networking, production deployment, and verification.
