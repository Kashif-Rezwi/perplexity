import { describe, expect, it } from 'vitest';
import type { ThreadHistoryItem } from '@/store/historyStore';
import { getServerHistoryViewState } from './useServerHistoryThreads';

function thread(id: string): ThreadHistoryItem {
  return {
    id,
    title: `Thread ${id}`,
    mode: 'web',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };
}

describe('getServerHistoryViewState', () => {
  it('shows local fallback rows without an error state when server history fails', () => {
    const fallbackThreads = [thread('local')];

    const state = getServerHistoryViewState({
      fallbackThreads,
      serverThreads: [],
      canUseLocalFallback: true,
      hasServerData: false,
      isPending: false,
      isError: true,
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    expect(state.threads).toEqual(fallbackThreads);
    expect(state.isError).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.hasNextPage).toBe(false);
    expect(state.isFetchingNextPage).toBe(false);
  });

  it('keeps the error state when no server data or local fallback is usable', () => {
    const state = getServerHistoryViewState({
      fallbackThreads: [],
      serverThreads: [],
      canUseLocalFallback: true,
      hasServerData: false,
      isPending: false,
      isError: true,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    expect(state.threads).toEqual([]);
    expect(state.isError).toBe(true);
  });

  it('shows a loading state instead of partial local fallback rows while initially loading', () => {
    const fallbackThreads = [thread('local')];

    const state = getServerHistoryViewState({
      fallbackThreads,
      serverThreads: [],
      canUseLocalFallback: true,
      hasServerData: false,
      isPending: true,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    expect(state.threads).toEqual([]);
    expect(state.isLoading).toBe(true);
  });

  it('does not use local fallback for deep research filters', () => {
    const state = getServerHistoryViewState({
      fallbackThreads: [thread('local')],
      serverThreads: [],
      canUseLocalFallback: false,
      hasServerData: false,
      isPending: false,
      isError: true,
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    expect(state.threads).toEqual([]);
    expect(state.isError).toBe(true);
  });
});
