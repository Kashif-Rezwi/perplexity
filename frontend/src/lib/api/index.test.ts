import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkError } from './client';
import { streamAsk } from './index';

afterEach(() => {
  vi.unstubAllGlobals();
});

function encodeSse(events: Array<{ event: string; data: unknown }>): Response {
  const encoder = new TextEncoder();
  const chunks = events.map(
    (e) => encoder.encode(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`),
  );

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }),
    { status: 200, statusText: 'OK' },
  );
}

describe('streamAsk', () => {
  it('throws NetworkError when the stream ends without a terminal event', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        encodeSse([
          {
            event: 'start',
            data: { threadId: 't1', turnId: 'u1', question: 'q', searchQuery: 'q' },
          },
          { event: 'delta', data: { text: 'partial' } },
        ]),
      ),
    );

    await expect(
      streamAsk('question', undefined, {
        onStart: vi.fn(),
        onDelta: vi.fn(),
      }),
    ).rejects.toThrow(
      new NetworkError('Stream ended before the answer completed'),
    );
  });

  it('throws ApiError when the server emits an error event', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        encodeSse([
          {
            event: 'start',
            data: { threadId: 't1', turnId: 'u1', question: 'q', searchQuery: 'q' },
          },
          {
            event: 'error',
            data: {
              message: 'Upstream search failed',
              code: 'SEARCH_FAILED',
              retryable: true,
            },
          },
        ]),
      ),
    );

    await expect(
      streamAsk('question', undefined, {
        onStart: vi.fn(),
        onDelta: vi.fn(),
      }),
    ).rejects.toMatchObject({
      status: 503,
      message: 'Upstream search failed',
      code: 'SEARCH_FAILED',
      retryable: true,
    });
  });

  it('passes the abort signal to fetch and reports cancellation', async () => {
    const controller = new AbortController();
    controller.abort();

    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url, init) => {
        capturedSignal = init?.signal as AbortSignal | undefined;
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      }),
    );

    await expect(
      streamAsk('question', undefined, { onStart: vi.fn() }, controller.signal),
    ).rejects.toThrow(new NetworkError('Ask stream was cancelled'));

    expect(capturedSignal).toBe(controller.signal);
  });
});
