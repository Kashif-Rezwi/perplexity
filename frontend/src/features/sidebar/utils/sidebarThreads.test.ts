import { describe, expect, it } from 'vitest';
import type { ThreadHistoryItem } from '@/store/historyStore';
import {
  getSidebarThreadViewState,
  getVisibleSidebarThreadGroups,
} from './sidebarThreads';

function historyItem(
  id: string,
  overrides: Partial<ThreadHistoryItem> = {},
): ThreadHistoryItem {
  return {
    id,
    title: `Thread ${id}`,
    mode: 'web',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getVisibleSidebarThreadGroups', () => {
  it('groups pinned rows from the same capped sidebar thread list', () => {
    const threads = Array.from({ length: 25 }, (_, index) =>
      historyItem(`thread-${index}`, {
        isPinned: index === 0 || index === 3 || index === 21,
      }),
    );

    const result = getVisibleSidebarThreadGroups(threads, 20);

    expect(result.pinnedThreads.map((thread) => thread.id)).toEqual([
      'thread-0',
      'thread-3',
    ]);
    expect(result.recentThreads).toHaveLength(18);
    expect([...result.pinnedThreads, ...result.recentThreads]).toHaveLength(20);
  });

  it('shows all fetched rows when fewer than the sidebar limit are available', () => {
    const threads = [
      historyItem('pinned-thread', { isPinned: true }),
      historyItem('recent-thread'),
    ];

    const result = getVisibleSidebarThreadGroups(threads, 20);

    expect(result.pinnedThreads.map((thread) => thread.id)).toEqual([
      'pinned-thread',
    ]);
    expect(result.recentThreads).toHaveLength(1);
    expect(result.recentThreads.map((thread) => thread.id)).toEqual([
      'recent-thread',
    ]);
  });

  it('does not render rows outside the fetched sidebar limit', () => {
    const threads = Array.from({ length: 21 }, (_, index) =>
      historyItem(`thread-${index}`, { isPinned: index === 20 }),
    );

    const result = getVisibleSidebarThreadGroups(threads, 20);

    expect(result.pinnedThreads).toHaveLength(0);
    expect(result.recentThreads).toHaveLength(20);
  });
});

describe('getSidebarThreadViewState', () => {
  const nowMs = Date.parse('2026-06-24T12:00:00.000Z');

  it('does not show stale local rows while the server list is initially loading', () => {
    const result = getSidebarThreadViewState({
      serverThreads: [],
      localThreads: [
        historyItem('old-local-thread', {
          updatedAt: '2026-06-20T00:00:00.000Z',
        }),
      ],
      hasServerData: false,
      isPending: true,
      isError: false,
      limit: 20,
      nowMs,
    });

    expect(result.pinnedThreads).toEqual([]);
    expect(result.recentThreads).toEqual([]);
    expect(result.isLoading).toBe(true);
  });

  it('shows only recent optimistic local rows while initially loading', () => {
    const result = getSidebarThreadViewState({
      serverThreads: [],
      localThreads: [
        historyItem('optimistic-thread', {
          updatedAt: '2026-06-24T11:59:30.000Z',
        }),
        historyItem('old-local-thread', {
          updatedAt: '2026-06-20T00:00:00.000Z',
        }),
      ],
      hasServerData: false,
      isPending: true,
      isError: false,
      limit: 20,
      nowMs,
    });

    expect(result.recentThreads.map((thread) => thread.id)).toEqual([
      'optimistic-thread',
    ]);
    expect(result.isLoading).toBe(false);
  });

  it('uses full local history only when the server list fails', () => {
    const result = getSidebarThreadViewState({
      serverThreads: [],
      localThreads: [
        historyItem('old-local-thread', {
          updatedAt: '2026-06-20T00:00:00.000Z',
        }),
      ],
      hasServerData: false,
      isPending: false,
      isError: true,
      limit: 20,
      nowMs,
    });

    expect(result.recentThreads.map((thread) => thread.id)).toEqual([
      'old-local-thread',
    ]);
    expect(result.isLoading).toBe(false);
  });

  it('merges recent optimistic local rows into the server list without duplicates', () => {
    const result = getSidebarThreadViewState({
      serverThreads: [
        historyItem('server-thread', {
          updatedAt: '2026-06-24T11:58:00.000Z',
        }),
        historyItem('already-server-backed', {
          updatedAt: '2026-06-24T11:57:00.000Z',
        }),
      ],
      localThreads: [
        historyItem('optimistic-thread', {
          updatedAt: '2026-06-24T11:59:30.000Z',
        }),
        historyItem('already-server-backed', {
          updatedAt: '2026-06-24T11:59:45.000Z',
        }),
        historyItem('old-local-thread', {
          updatedAt: '2026-06-20T00:00:00.000Z',
        }),
      ],
      hasServerData: true,
      isPending: false,
      isError: false,
      limit: 20,
      nowMs,
    });

    expect(result.recentThreads.map((thread) => thread.id)).toEqual([
      'optimistic-thread',
      'server-thread',
      'already-server-backed',
    ]);
  });
});
