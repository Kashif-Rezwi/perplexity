import { useMemo } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { getThreads } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';
import { mapThreadSummaryToHistoryItem } from '@/lib/mappers/thread-summary.mapper';
import type { ThreadHistoryItem } from '@/store/historyStore';
import type { ThreadListResponse } from '@/types/api.types';
import type { HistoryTypeFilter, SortOrder } from '../constants/history.constants';
import { useVisibleHistoryThreads } from './useVisibleHistoryThreads';

const HISTORY_PAGE_SIZE = 20;

type UseServerHistoryThreadsInput = {
  localThreads: ThreadHistoryItem[];
  typeFilter: HistoryTypeFilter;
  sortOrder: SortOrder;
  searchQuery: string;
};

export function useServerHistoryThreads({
  localThreads,
  typeFilter,
  sortOrder,
  searchQuery,
}: UseServerHistoryThreadsInput) {
  const normalizedSearchQuery = searchQuery.trim();

  const fallbackThreads = useVisibleHistoryThreads({
    threads: localThreads,
    typeFilter,
    sortOrder,
    searchQuery,
  });

  const threadListQuery = useInfiniteQuery<ThreadListResponse>({
    queryKey: queryKeys.threadsHistory({
      limit: HISTORY_PAGE_SIZE,
      mode: typeFilter,
      q: normalizedSearchQuery,
      sort: sortOrder,
    }),
    queryFn: ({ pageParam }) =>
      getThreads({
        limit: HISTORY_PAGE_SIZE,
        cursor: typeof pageParam === 'string' ? pageParam : undefined,
        mode: typeFilter,
        q: normalizedSearchQuery,
        sort: sortOrder,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });

  const serverThreads = useMemo(
    () =>
      threadListQuery.data?.pages.flatMap((page) =>
        page.items.map(mapThreadSummaryToHistoryItem),
      ) ?? [],
    [threadListQuery.data],
  );

  const canUseLocalFallback = typeFilter !== 'deep-research';
  const shouldUseFallback =
    canUseLocalFallback && !threadListQuery.data && threadListQuery.isError;
  const shouldUseInitialFallback =
    canUseLocalFallback &&
    !threadListQuery.data &&
    threadListQuery.isPending &&
    fallbackThreads.length > 0;
  const shouldShowFallback = shouldUseFallback || shouldUseInitialFallback;

  return {
    threads: shouldShowFallback ? fallbackThreads : serverThreads,
    isLoading: threadListQuery.isPending && fallbackThreads.length === 0,
    isError: threadListQuery.isError && serverThreads.length === 0,
    hasNextPage: threadListQuery.hasNextPage,
    isFetchingNextPage: threadListQuery.isFetchingNextPage,
    fetchNextPage: threadListQuery.fetchNextPage,
  };
}
