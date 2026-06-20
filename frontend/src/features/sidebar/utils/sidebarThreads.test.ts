import { describe, expect, it } from 'vitest';
import type { ThreadHistoryItem } from '@/store/historyStore';
import { getVisibleSidebarThreadGroups } from './sidebarThreads';

function historyItem(id: string): ThreadHistoryItem {
  return {
    id,
    title: `Thread ${id}`,
    mode: 'web',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };
}

describe('getVisibleSidebarThreadGroups', () => {
  it('returns pinned threads first and caps the total visible thread count', () => {
    const pinnedThreads = Array.from({ length: 3 }, (_, index) =>
      historyItem(`pinned-${index}`),
    );
    const recentThreads = Array.from({ length: 25 }, (_, index) =>
      historyItem(`recent-${index}`),
    );

    const result = getVisibleSidebarThreadGroups(
      pinnedThreads,
      recentThreads,
      20,
    );

    expect(result.pinnedThreads).toHaveLength(3);
    expect(result.recentThreads).toHaveLength(17);
    expect([...result.pinnedThreads, ...result.recentThreads]).toHaveLength(20);
  });

  it('does not duplicate a pinned thread that also appears in recent threads', () => {
    const pinnedThread = historyItem('same-thread');
    const result = getVisibleSidebarThreadGroups(
      [pinnedThread],
      [pinnedThread, historyItem('recent-thread')],
      20,
    );

    expect(result.pinnedThreads.map((thread) => thread.id)).toEqual([
      'same-thread',
    ]);
    expect(result.recentThreads.map((thread) => thread.id)).toEqual([
      'recent-thread',
    ]);
  });
});
