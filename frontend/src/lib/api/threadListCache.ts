import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';
import type {
  ThreadDetailResponse,
  ThreadListResponse,
  ThreadSummaryItem,
} from '@/types/api.types';

type ThreadCacheSnapshot = {
  queryKey: QueryKey;
  data: unknown;
};

export function removeThreadFromThreadListCaches(
  queryClient: QueryClient,
  threadId: string,
) {
  removeThreadsFromThreadListCaches(queryClient, [threadId]);
}

export function removeThreadsFromManagedCaches(
  queryClient: QueryClient,
  threadIds: string[],
) {
  removeThreadsFromThreadListCaches(queryClient, threadIds);

  for (const threadId of threadIds) {
    queryClient.removeQueries({ queryKey: ['thread', threadId] });
    queryClient.removeQueries({ queryKey: ['sources', threadId] });
  }
}

export function removeThreadsFromThreadListCaches(
  queryClient: QueryClient,
  threadIds: string[],
) {
  const idsToRemove = new Set(threadIds);

  queryClient.setQueriesData<ThreadListResponse>(
    { queryKey: ['threads'] },
    (data) => {
      if (!isThreadListResponse(data)) return data;

      return removeThreadsFromPage(data, idsToRemove);
    },
  );

  queryClient.setQueriesData<InfiniteData<ThreadListResponse>>(
    { queryKey: ['threads'] },
    (data) => {
      if (!isInfiniteThreadListResponse(data)) return data;

      return {
        ...data,
        pages: data.pages.map((page) => removeThreadsFromPage(page, idsToRemove)),
      };
    },
  );

  queryClient.setQueriesData<ThreadSummaryItem[]>(
    { queryKey: ['threads', 'pinned'] },
    (data) => {
      if (!Array.isArray(data)) return data;
      return data.filter((thread) => !idsToRemove.has(thread.threadId));
    },
  );
}

export function updateThreadInThreadListCaches(
  queryClient: QueryClient,
  thread: ThreadSummaryItem,
) {
  queryClient.setQueriesData<ThreadListResponse>(
    { queryKey: ['threads'] },
    (data) => {
      if (!isThreadListResponse(data)) return data;

      return updateThreadInPage(data, thread);
    },
  );

  queryClient.setQueriesData<InfiniteData<ThreadListResponse>>(
    { queryKey: ['threads'] },
    (data) => {
      if (!isInfiniteThreadListResponse(data)) return data;

      return {
        ...data,
        pages: data.pages.map((page) => updateThreadInPage(page, thread)),
      };
    },
  );

  updatePinnedThreadCache(queryClient, thread);
}

export function updateThreadPinInCaches(
  queryClient: QueryClient,
  thread: ThreadSummaryItem,
) {
  updateThreadInThreadListCaches(queryClient, thread);
  moveThreadForPinState(queryClient, thread);
}

export function snapshotThreadCaches(
  queryClient: QueryClient,
): ThreadCacheSnapshot[] {
  return queryClient
    .getQueriesData({ queryKey: ['threads'] })
    .map(([queryKey, data]) => ({ queryKey, data }));
}

export function restoreThreadCaches(
  queryClient: QueryClient,
  snapshots: ThreadCacheSnapshot[],
) {
  for (const snapshot of snapshots) {
    queryClient.setQueryData(snapshot.queryKey, snapshot.data);
  }
}

export function updateThreadPinOptimistically(
  queryClient: QueryClient,
  threadId: string,
  isPinned: boolean,
) {
  const cachedThread = findThreadInCaches(queryClient, threadId);

  if (!cachedThread) {
    return;
  }

  updateThreadInThreadListCaches(queryClient, {
    ...cachedThread,
    isPinned,
    pinnedAt: isPinned ? new Date().toISOString() : null,
  });
  moveThreadForPinState(queryClient, {
    ...cachedThread,
    isPinned,
    pinnedAt: isPinned ? new Date().toISOString() : null,
  });
}

export function shouldRefetchUnpinnedThreadLists(
  queryClient: QueryClient,
  threadId: string,
) {
  return !hasThreadInNonPinnedThreadListCaches(queryClient, threadId);
}

export function invalidateUnpinnedThreadListCaches(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => isExcludePinnedThreadListQuery(query.queryKey),
  });
}

export function updateThreadDetailCacheTitle(
  queryClient: QueryClient,
  threadId: string,
  title: string,
) {
  queryClient.setQueryData<ThreadDetailResponse>(
    ['thread', threadId],
    (data) => (data ? { ...data, title } : data),
  );
}

function removeThreadsFromPage(
  page: ThreadListResponse,
  threadIds: Set<string>,
): ThreadListResponse {
  const items = page.items.filter((thread) => !threadIds.has(thread.threadId));

  if (items.length === page.items.length) {
    return page;
  }

  return {
    ...page,
    items,
  };
}

function updateThreadInPage(
  page: ThreadListResponse,
  updatedThread: ThreadSummaryItem,
): ThreadListResponse {
  let didUpdate = false;
  const items = page.items.map((thread) => {
    if (thread.threadId !== updatedThread.threadId) {
      return thread;
    }

    didUpdate = true;
    return updatedThread;
  });

  return didUpdate ? { ...page, items } : page;
}

function updatePinnedThreadCache(
  queryClient: QueryClient,
  updatedThread: ThreadSummaryItem,
) {
  queryClient.setQueriesData<ThreadSummaryItem[]>(
    { queryKey: ['threads', 'pinned'] },
    (data) => {
      if (!Array.isArray(data)) return data;

      if (!updatedThread.isPinned) {
        return data.filter(
          (thread) => thread.threadId !== updatedThread.threadId,
        );
      }

      const existingIndex = data.findIndex(
        (thread) => thread.threadId === updatedThread.threadId,
      );

      if (existingIndex === -1) {
        return [updatedThread, ...data];
      }

      return data.map((thread, index) =>
        index === existingIndex ? updatedThread : thread,
      );
    },
  );
}

function moveThreadForPinState(
  queryClient: QueryClient,
  updatedThread: ThreadSummaryItem,
) {
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: ['threads'] })) {
    const { queryKey } = query;
    const excludePinned = isExcludePinnedThreadListQuery(queryKey);

    queryClient.setQueryData(queryKey, (data: unknown) =>
      updateThreadPinInCacheValue(data, updatedThread, excludePinned),
    );
  }
}

function removePinnedThreadFromPage(
  page: ThreadListResponse,
  updatedThread: ThreadSummaryItem,
): ThreadListResponse {
  return updatedThread.isPinned
    ? removeThreadsFromPage(page, new Set([updatedThread.threadId]))
    : updateThreadInPage(page, updatedThread);
}

function hasThreadInNonPinnedThreadListCaches(
  queryClient: QueryClient,
  threadId: string,
) {
  return queryClient
    .getQueryCache()
    .findAll({ queryKey: ['threads'] })
    .some(
      (query) =>
        isExcludePinnedThreadListQuery(query.queryKey) &&
        findThreadInCacheValue(query.state.data, threadId) !== null,
    );
}

function updateThreadPinInCacheValue(
  value: unknown,
  updatedThread: ThreadSummaryItem,
  excludePinned: boolean,
) {
  if (isThreadListResponse(value)) {
    return excludePinned
      ? removePinnedThreadFromPage(value, updatedThread)
      : updateThreadInPage(value, updatedThread);
  }

  if (isInfiniteThreadListResponse(value)) {
    return {
      ...value,
      pages: value.pages.map((page) =>
        excludePinned
          ? removePinnedThreadFromPage(page, updatedThread)
          : updateThreadInPage(page, updatedThread),
      ),
    };
  }

  return value;
}

function isExcludePinnedThreadListQuery(queryKey: QueryKey) {
  return queryKey.some(
    (part) =>
      typeof part === 'object' &&
      part !== null &&
      (part as { excludePinned?: unknown }).excludePinned === true,
  );
}

function findThreadInCaches(
  queryClient: QueryClient,
  threadId: string,
): ThreadSummaryItem | null {
  const cachedThreads = queryClient.getQueriesData({ queryKey: ['threads'] });

  for (const [, data] of cachedThreads) {
    const thread = findThreadInCacheValue(data, threadId);

    if (thread) {
      return thread;
    }
  }

  return null;
}

function findThreadInCacheValue(
  value: unknown,
  threadId: string,
): ThreadSummaryItem | null {
  if (isThreadListResponse(value)) {
    return value.items.find((thread) => thread.threadId === threadId) ?? null;
  }

  if (isInfiniteThreadListResponse(value)) {
    for (const page of value.pages) {
      const thread = page.items.find((item) => item.threadId === threadId);

      if (thread) {
        return thread;
      }
    }
  }

  if (Array.isArray(value)) {
    return (
      value.find(
        (thread): thread is ThreadSummaryItem =>
          isThreadSummaryItem(thread) && thread.threadId === threadId,
      ) ?? null
    );
  }

  return null;
}

function isThreadListResponse(value: unknown): value is ThreadListResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ThreadListResponse).items)
  );
}

function isThreadSummaryItem(value: unknown): value is ThreadSummaryItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ThreadSummaryItem).threadId === 'string'
  );
}

function isInfiniteThreadListResponse(
  value: unknown,
): value is InfiniteData<ThreadListResponse> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as InfiniteData<ThreadListResponse>).pages)
  );
}
