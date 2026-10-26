import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, readErrorMessage } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readErrorMessage', () => {
  it('extracts the message from a JSON error body', async () => {
    const response = new Response(JSON.stringify({ message: 'Bad request' }), {
      status: 400,
      statusText: 'Bad Request',
    });

    expect(await readErrorMessage(response)).toBe('Bad request');
  });

  it('returns raw text when the error body is not JSON', async () => {
    const html = '<html>502 Bad Gateway</html>';
    const response = new Response(html, {
      status: 502,
      statusText: 'Bad Gateway',
    });

    expect(await readErrorMessage(response)).toBe(html);
  });

  it('joins class-validator array messages (NestJS validation errors)', async () => {
    const response = new Response(
      JSON.stringify({
        statusCode: 400,
        message: ['title must not be empty', 'title must be a string'],
        error: 'Bad Request',
      }),
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await readErrorMessage(response)).toBe(
      'title must not be empty; title must be a string',
    );
  });

  it('falls back to statusText when the error body is empty', async () => {
    const response = new Response('', {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(await readErrorMessage(response)).toBe('Internal Server Error');
  });
});

describe('apiClient', () => {
  it('throws an ApiError with the raw text for a non-JSON error response', async () => {
    const html = '<html>503 Service Unavailable</html>';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(html, {
          status: 503,
          statusText: 'Service Unavailable',
        }),
      ),
    );

    await expect(apiClient('/threads/1')).rejects.toMatchObject({
      status: 503,
      message: html,
    });
  });
});
