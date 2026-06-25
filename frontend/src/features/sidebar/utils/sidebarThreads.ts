import type { ThreadHistoryItem } from '@/store/historyStore';

const OPTIMISTIC_THREAD_WINDOW_MS = 2 * 60 * 1000;

export type SidebarThreadGroups = {
  pinnedThreads: ThreadHistoryItem[];
  recentThreads: ThreadHistoryItem[];
};

type SidebarThreadViewStateInput = {
  serverThreads: ThreadHistoryItem[];
  localThreads: ThreadHistoryItem[];
  hasServerData: boolean;
  isPending: boolean;
  isError: boolean;
  limit: number;
  nowMs?: number;
};

export type SidebarThreadViewState = SidebarThreadGroups & {
  isLoading: boolean;
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

export function getSidebarThreadViewState({
  serverThreads,
  localThreads,
  hasServerData,
  isPending,
  isError,
  limit,
  nowMs = Date.now(),
}: SidebarThreadViewStateInput): SidebarThreadViewState {
  const threads = getSidebarThreads({
    serverThreads,
    localThreads,
    hasServerData,
    isPending,
    isError,
    limit,
    nowMs,
  });

  return {
    ...getVisibleSidebarThreadGroups(threads, limit),
    isLoading: isPending && threads.length === 0,
  };
}

function getSidebarThreads({
  serverThreads,
  localThreads,
  hasServerData,
  isPending,
  isError,
  limit,
  nowMs,
}: SidebarThreadViewStateInput & { nowMs: number }): ThreadHistoryItem[] {
  if (hasServerData) {
    return mergeServerThreadsWithOptimisticLocalThreads({
      serverThreads,
      localThreads,
      limit,
      nowMs,
    });
  }

  if (isError) {
    return localThreads.slice(0, limit);
  }

  if (isPending) {
    return localThreads
      .filter((thread) => isRecentOptimisticThread(thread, nowMs))
      .slice(0, limit);
  }

  return [];
}

function mergeServerThreadsWithOptimisticLocalThreads({
  serverThreads,
  localThreads,
  limit,
  nowMs,
}: {
  serverThreads: ThreadHistoryItem[];
  localThreads: ThreadHistoryItem[];
  limit: number;
  nowMs: number;
}): ThreadHistoryItem[] {
  const serverThreadIds = new Set(serverThreads.map((thread) => thread.id));
  const optimisticLocalThreads = localThreads.filter(
    (thread) =>
      !serverThreadIds.has(thread.id) &&
      isRecentOptimisticThread(thread, nowMs),
  );

  return [...optimisticLocalThreads, ...serverThreads]
    .sort((a, b) => getThreadTime(b) - getThreadTime(a))
    .slice(0, limit);
}

function isRecentOptimisticThread(
  thread: ThreadHistoryItem,
  nowMs: number,
): boolean {
  const updatedAt = getThreadTime(thread);

  if (updatedAt === 0) {
    return false;
  }

  return nowMs - updatedAt <= OPTIMISTIC_THREAD_WINDOW_MS;
}

function getThreadTime(thread: ThreadHistoryItem): number {
  if (!thread.updatedAt) {
    return 0;
  }

  const time = Date.parse(thread.updatedAt);

  return Number.isFinite(time) ? time : 0;
}
