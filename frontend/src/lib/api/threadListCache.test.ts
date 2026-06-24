import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type {
  ThreadDetailResponse,
  ThreadListResponse,
  ThreadSummaryItem,
} from '@/types/api.types';
import {
  invalidateThreadListCaches,
  removeThreadsFromManagedCaches,
  updateThreadDetailCacheTitle,
} from './threadListCache';
import { queryKeys } from './queryKeys';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function thread(
  threadId: string,
  overrides: Partial<ThreadSummaryItem> = {},
): ThreadSummaryItem {
  return {
    threadId,
    title: `Thread ${threadId}`,
    status: 'completed',
    mode: 'web',
    answerPreview: null,
    isPinned: false,
    pinnedAt: null,
    totalSourceCount: 0,
    turnCount: 1,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function list(items: ThreadSummaryItem[]): ThreadListResponse {
  return { items, nextCursor: null };
}

describe('thread list cache helpers', () => {
  it('invalidates server thread list queries without rewriting list data', async () => {
    const queryClient = createQueryClient();
    const original = thread('a');

    queryClient.setQueryData(['threads', 'history'], list([original]));
    queryClient.setQueryData(['threads', 'pinned'], [original]);

    await invalidateThreadListCaches(queryClient);

    expect(queryClient.getQueryState(['threads', 'history'])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(['threads', 'pinned'])?.isInvalidated).toBe(true);
    expect(
      queryClient.getQueryData<ThreadListResponse>(['threads', 'history'])
        ?.items,
    ).toEqual([original]);
  });

  it('removes deleted thread detail and source caches only', () => {
    const queryClient = createQueryClient();
    const original = thread('a');
    const detail: ThreadDetailResponse = { ...original, turns: [] };

    queryClient.setQueryData(['threads', 'history'], list([original]));
    queryClient.setQueryData(['thread', 'a'], detail);
    queryClient.setQueryData(queryKeys.sourcesForTurn('a', 'turn-a'), {
      items: [],
      nextCursor: null,
    });

    removeThreadsFromManagedCaches(queryClient, ['a']);

    expect(queryClient.getQueryData(['thread', 'a'])).toBeUndefined();
    expect(
      queryClient.getQueryData(queryKeys.sourcesForTurn('a', 'turn-a')),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData<ThreadListResponse>(['threads', 'history'])
        ?.items,
    ).toEqual([original]);
  });

  it('updates the thread detail title cache for immediate rename feedback', () => {
    const queryClient = createQueryClient();
    const original = thread('a', { title: 'Original title' });
    const detail: ThreadDetailResponse = { ...original, turns: [] };

    queryClient.setQueryData(['thread', 'a'], detail);

    updateThreadDetailCacheTitle(queryClient, 'a', 'Renamed title');

    expect(
      queryClient.getQueryData<ThreadDetailResponse>(['thread', 'a'])?.title,
    ).toBe('Renamed title');
  });
});
