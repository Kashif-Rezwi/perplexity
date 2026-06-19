import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type {
  ThreadDetailResponse,
  ThreadListResponse,
  ThreadSummaryItem,
} from '@/types/api.types';

export function removeThreadFromThreadListCaches(
  queryClient: QueryClient,
  threadId: string,
) {
  removeThreadsFromThreadListCaches(queryClient, [threadId]);
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

function isThreadListResponse(value: unknown): value is ThreadListResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ThreadListResponse).items)
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
