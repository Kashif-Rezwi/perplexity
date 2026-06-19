import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { ThreadListResponse } from '@/types/api.types';

export function removeThreadFromThreadListCaches(
  queryClient: QueryClient,
  threadId: string,
) {
  queryClient.setQueriesData<ThreadListResponse>(
    { queryKey: ['threads'] },
    (data) => {
      if (!isThreadListResponse(data)) return data;

      return removeThreadFromPage(data, threadId);
    },
  );

  queryClient.setQueriesData<InfiniteData<ThreadListResponse>>(
    { queryKey: ['threads'] },
    (data) => {
      if (!isInfiniteThreadListResponse(data)) return data;

      return {
        ...data,
        pages: data.pages.map((page) => removeThreadFromPage(page, threadId)),
      };
    },
  );
}

function removeThreadFromPage(
  page: ThreadListResponse,
  threadId: string,
): ThreadListResponse {
  const items = page.items.filter((thread) => thread.threadId !== threadId);

  if (items.length === page.items.length) {
    return page;
  }

  return {
    ...page,
    items,
  };
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
