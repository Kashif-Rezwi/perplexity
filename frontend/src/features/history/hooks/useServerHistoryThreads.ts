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

type ServerHistoryViewStateInput = {
  fallbackThreads: ThreadHistoryItem[];
  serverThreads: ThreadHistoryItem[];
  canUseLocalFallback: boolean;
  hasServerData: boolean;
  isPending: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

export function getServerHistoryViewState({
  fallbackThreads,
  serverThreads,
  canUseLocalFallback,
  hasServerData,
  isPending,
  isError,
  hasNextPage,
  isFetchingNextPage,
}: ServerHistoryViewStateInput) {
  const canShowFallback =
    canUseLocalFallback && !hasServerData && fallbackThreads.length > 0;
  const shouldShowFallback = canShowFallback && (isPending || isError);

  return {
    threads: shouldShowFallback ? fallbackThreads : serverThreads,
    isLoading: isPending && !shouldShowFallback,
    isError: isError && !hasServerData && !shouldShowFallback,
    hasNextPage: shouldShowFallback ? false : hasNextPage,
    isFetchingNextPage: shouldShowFallback ? false : isFetchingNextPage,
  };
}

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

  return {
    ...getServerHistoryViewState({
      fallbackThreads,
      serverThreads,
      canUseLocalFallback,
      hasServerData: Boolean(threadListQuery.data),
      isPending: threadListQuery.isPending,
      isError: threadListQuery.isError,
      hasNextPage: threadListQuery.hasNextPage,
      isFetchingNextPage: threadListQuery.isFetchingNextPage,
    }),
    fetchNextPage: threadListQuery.fetchNextPage,
  };
}
