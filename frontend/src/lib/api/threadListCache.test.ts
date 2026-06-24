import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  removeThreadsFromManagedCaches,
  removeThreadsFromThreadListCaches,
  shouldRefetchUnpinnedThreadLists,
  updateThreadInThreadListCaches,
  updateThreadPinInCaches,
} from './threadListCache';
import { queryKeys } from './queryKeys';
import type {
  ThreadDetailResponse,
  ThreadListResponse,
  ThreadSummaryItem,
} from '@/types/api.types';

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

function infinite(items: ThreadSummaryItem[]): InfiniteData<ThreadListResponse> {
  return {
    pages: [list(items)],
    pageParams: [null],
  };
}

describe('thread list cache helpers', () => {
  it('updates renamed threads in normal, infinite, and pinned caches', () => {
    const queryClient = createQueryClient();
    const original = thread('a', { isPinned: true });
    const renamed = { ...original, title: 'Renamed thread' };

    queryClient.setQueryData(['threads', 'history'], list([original]));
    queryClient.setQueryData(['threads', 'infinite'], infinite([original]));
    queryClient.setQueryData(['threads', 'pinned'], [original]);

    updateThreadInThreadListCaches(queryClient, renamed);

    expect(
      queryClient.getQueryData<ThreadListResponse>(['threads', 'history'])
        ?.items[0].title,
    ).toBe('Renamed thread');
    expect(
      queryClient.getQueryData<InfiniteData<ThreadListResponse>>([
        'threads',
        'infinite',
      ])?.pages[0].items[0].title,
    ).toBe('Renamed thread');
    expect(
      queryClient.getQueryData<ThreadSummaryItem[]>(['threads', 'pinned'])?.[0]
        .title,
    ).toBe('Renamed thread');
  });

  it('removes deleted threads from list, pinned, detail, and source caches', () => {
    const queryClient = createQueryClient();
    const first = thread('a', { isPinned: true });
    const second = thread('b');
    const detail: ThreadDetailResponse = { ...first, turns: [] };

    queryClient.setQueryData(['threads', 'history'], list([first, second]));
    queryClient.setQueryData(['threads', 'infinite'], infinite([first, second]));
    queryClient.setQueryData(['threads', 'pinned'], [first]);
    queryClient.setQueryData(['thread', 'a'], detail);
    queryClient.setQueryData(queryKeys.sourcesForTurn('a', 'turn-a'), {
      items: [],
      nextCursor: null,
    });

    removeThreadsFromManagedCaches(queryClient, ['a']);

    expect(
      queryClient
        .getQueryData<ThreadListResponse>(['threads', 'history'])
        ?.items.map((item) => item.threadId),
    ).toEqual(['b']);
    expect(
      queryClient
        .getQueryData<InfiniteData<ThreadListResponse>>(['threads', 'infinite'])
        ?.pages[0].items.map((item) => item.threadId),
    ).toEqual(['b']);
    expect(queryClient.getQueryData(['threads', 'pinned'])).toEqual([]);
    expect(queryClient.getQueryData(['thread', 'a'])).toBeUndefined();
    expect(
      queryClient.getQueryData(queryKeys.sourcesForTurn('a', 'turn-a')),
    ).toBeUndefined();
  });

  it('moves a pinned thread into pinned cache and out of excludePinned lists', () => {
    const queryClient = createQueryClient();
    const first = thread('a');
    const second = thread('b');
    const pinned = {
      ...first,
      isPinned: true,
      pinnedAt: '2026-06-02T00:00:00.000Z',
    };

    queryClient.setQueryData(
      ['threads', 'sidebar', { excludePinned: true }],
      list([first, second]),
    );
    queryClient.setQueryData(['threads', 'history'], list([first, second]));
    queryClient.setQueryData(['threads', 'pinned'], []);

    updateThreadPinInCaches(queryClient, pinned);

    expect(
      queryClient
        .getQueryData<ThreadListResponse>([
          'threads',
          'sidebar',
          { excludePinned: true },
        ])
        ?.items.map((item) => item.threadId),
    ).toEqual(['b']);
    expect(
      queryClient.getQueryData<ThreadListResponse>(['threads', 'history'])
        ?.items[0].isPinned,
    ).toBe(true);
    expect(queryClient.getQueryData<ThreadSummaryItem[]>(['threads', 'pinned']))
      .toMatchObject([{ threadId: 'a', isPinned: true }]);
  });

  it('removes an unpinned thread from pinned cache and reports when unpinned lists need refetching', () => {
    const queryClient = createQueryClient();
    const pinned = thread('a', {
      isPinned: true,
      pinnedAt: '2026-06-02T00:00:00.000Z',
    });
    const unpinned = { ...pinned, isPinned: false, pinnedAt: null };

    queryClient.setQueryData(
      ['threads', 'sidebar', { excludePinned: true }],
      list([]),
    );
    queryClient.setQueryData(['threads', 'pinned'], [pinned]);

    expect(shouldRefetchUnpinnedThreadLists(queryClient, 'a')).toBe(true);

    updateThreadPinInCaches(queryClient, unpinned);

    expect(queryClient.getQueryData(['threads', 'pinned'])).toEqual([]);

    queryClient.setQueryData(
      ['threads', 'sidebar', { excludePinned: true }],
      list([unpinned]),
    );

    expect(shouldRefetchUnpinnedThreadLists(queryClient, 'a')).toBe(false);
  });

  it('keeps legacy delete helper scoped to thread list caches', () => {
    const queryClient = createQueryClient();
    const first = thread('a');

    queryClient.setQueryData(['threads', 'history'], list([first]));
    queryClient.setQueryData(['thread', 'a'], { ...first, turns: [] });

    removeThreadsFromThreadListCaches(queryClient, ['a']);

    expect(
      queryClient.getQueryData<ThreadListResponse>(['threads', 'history'])
        ?.items,
    ).toEqual([]);
    expect(queryClient.getQueryData(['thread', 'a'])).toBeDefined();
  });
});
