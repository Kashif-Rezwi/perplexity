import { describe, expect, it } from 'vitest';
import type { ThreadHistoryItem } from '@/store/historyStore';
import { getVisibleSidebarThreadGroups } from './sidebarThreads';

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
