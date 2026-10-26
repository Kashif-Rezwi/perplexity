// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkError } from '@/lib/api/client';
import { streamAsk, streamRetryAsk } from '@/lib/api';
import { useAskSubmit } from './useAskSubmit';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    streamAsk: vi.fn(),
    streamRetryAsk: vi.fn(),
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const startEvent = {
  threadId: 'thread-1',
  turnId: 'turn-1',
  question: 'What is Prisma?',
  searchQuery: 'What is Prisma?',
  mode: 'web' as const,
};

describe('useAskSubmit', () => {
  beforeEach(() => {
    vi.mocked(streamAsk).mockReset();
    vi.mocked(streamRetryAsk).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('blocks a second submit while the first stream is pending', async () => {
    let resolveStream: () => void = () => {};
    vi.mocked(streamAsk).mockImplementation(async (_q, _t, handlers) => {
      handlers.onStart?.(startEvent);
      await new Promise<void>((resolve) => {
        resolveStream = resolve;
      });
    });

    const { result } = renderHook(() => useAskSubmit({ threadId: 'thread-1' }), {
      wrapper: createWrapper(),
    });

    expect(result.current.submitAsk('First question')).toBe(true);

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.submitAsk('Second question')).toBe(false);

    resolveStream();
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(streamAsk).toHaveBeenCalledTimes(1);
  });

  it('surfaces a truncation error after the stream started', async () => {
    vi.mocked(streamAsk).mockImplementation(async (_q, _t, handlers) => {
      handlers.onStart?.(startEvent);
      throw new NetworkError('Stream ended before the answer completed');
    });

    const { result } = renderHook(() => useAskSubmit({ threadId: 'thread-1' }), {
      wrapper: createWrapper(),
    });

    result.current.submitAsk('What is Prisma?');

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        'Stream ended before the answer completed',
      ),
    );
  });

  it('aborts the in-flight stream when the hook unmounts', async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.mocked(streamAsk).mockImplementation(
      async (_q, _t, _handlers, signal) => {
        capturedSignal = signal;
        await new Promise<void>(() => {});
      },
    );

    const { result, unmount } = renderHook(
      () => useAskSubmit({ threadId: 'thread-1' }),
      { wrapper: createWrapper() },
    );

    result.current.submitAsk('What is Prisma?');
    await waitFor(() => expect(capturedSignal).toBeDefined());
    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
