/**
 * Centralised backend URL used by the API client (server-side requests)
 * and the Next.js dev proxy rewrite (next.config.ts).
 *
 * Override at runtime via the BACKEND_URL environment variable.
 */
export const BACKEND_URL =
  process.env.BACKEND_URL ?? 'http://localhost:8080';
