import type { ThreadHistoryItem } from '@/store/historyStore';

export type SidebarThreadGroups = {
  pinnedThreads: ThreadHistoryItem[];
  recentThreads: ThreadHistoryItem[];
};

export function getVisibleSidebarThreadGroups(
  pinnedThreads: ThreadHistoryItem[],
  recentThreads: ThreadHistoryItem[],
  limit: number,
): SidebarThreadGroups {
  const visiblePinnedThreads = pinnedThreads.slice(0, limit);
  const pinnedIds = new Set(visiblePinnedThreads.map((thread) => thread.id));
  const visibleRecentThreads = recentThreads
    .filter((thread) => !pinnedIds.has(thread.id))
    .slice(0, Math.max(0, limit - visiblePinnedThreads.length));

  return {
    pinnedThreads: visiblePinnedThreads,
    recentThreads: visibleRecentThreads,
  };
}
