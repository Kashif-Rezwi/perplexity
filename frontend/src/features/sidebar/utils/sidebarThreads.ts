import type { ThreadHistoryItem } from '@/store/historyStore';

export type SidebarThreadGroups = {
  pinnedThreads: ThreadHistoryItem[];
  recentThreads: ThreadHistoryItem[];
};

export function getVisibleSidebarThreadGroups(
  threads: ThreadHistoryItem[],
  limit: number,
): SidebarThreadGroups {
  const visibleThreads = threads.slice(0, limit);

  return {
    pinnedThreads: visibleThreads.filter((thread) => thread.isPinned === true),
    recentThreads: visibleThreads.filter((thread) => thread.isPinned !== true),
  };
}
