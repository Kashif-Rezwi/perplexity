# Perplexity Clone

This repository contains a vertical slice of a Perplexity-inspired AI answer engine. It is designed to take user questions, perform web searches for context, and generate comprehensive answers with citations, just like Perplexity.

The project is structured as a full-stack monorepo, consisting of a NestJS backend and a Next.js frontend.

## Architecture Overview

*   **Backend (`/backend`)**: A modular monolith built with **NestJS**, **TypeScript**, and **PostgreSQL**. It handles API requests, database persistence via Prisma, web search integration (Tavily), and AI answer generation (provider-agnostic, supporting OpenAI and Groq).
*   **Frontend (`/frontend`)**: A modern web application built with **Next.js**, **React**, and **Tailwind CSS**. It features a responsive layout, a two-column UI (sidebar and main thread view), and custom markdown parsing for citation badges.

## Quick Start

To run the application locally, you will need to start both the backend and frontend servers.

### 1. Start the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Ensure your `.env` file is configured with the necessary API keys (OpenAI/Groq, Tavily, Database URL).
3. Install dependencies and start the development server:
   ```bash
   npm install
   npm run dev
   ```
   The backend runs on `http://localhost:8080`.

### 2. Start the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies and start the development server:
   ```bash
   npm install
   npm run dev
   ```
   The frontend runs on `http://localhost:3001`.

### 3. Usage

Open your browser to `http://localhost:3001`. You can enter a question in the prompt input, and the frontend will communicate with the backend to retrieve context and generate an AI-powered response.

## Documentation

Comprehensive project documentation has been consolidated into the root `_docs/` directory:

*   **[System Architecture](_docs/ARCHITECTURE.md)**: Frontend and backend system design, tech stack choices, and data flow.
*   **[Tech Stack](_docs/TECH_STACK.md)**: Detailed list of frontend and backend technologies and rationale.
*   **[API Contracts](_docs/API.md)**: Detailed request and response payloads for all backend endpoints.
*   **[Product Roadmap](_docs/ROADMAP.md)**: Current development phase and future planned features.
