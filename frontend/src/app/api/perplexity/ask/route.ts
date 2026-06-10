import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080';
const ASK_TIMEOUT_MS = 120_000;

/** Allow long-running ask requests in production deployments that support it. */
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}/perplexity/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });

    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'The request timed out. Please try again.'
        : 'Failed to connect to the server.';

    return NextResponse.json({ message, statusCode: 504 }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
