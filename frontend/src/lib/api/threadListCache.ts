import type { QueryClient } from '@tanstack/react-query';
import type { ThreadDetailResponse } from '@/types/api.types';
import { queryKeys } from './queryKeys';

export function invalidateThreadListCaches(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.threadsRoot });
}

export function removeThreadsFromManagedCaches(
  queryClient: QueryClient,
  threadIds: string[],
) {
  for (const threadId of threadIds) {
    queryClient.removeQueries({ queryKey: queryKeys.thread(threadId) });
    queryClient.removeQueries({ queryKey: queryKeys.sourcesForThread(threadId) });
  }
}

export function updateThreadDetailCacheTitle(
  queryClient: QueryClient,
  threadId: string,
  title: string,
) {
  queryClient.setQueryData<ThreadDetailResponse>(
    queryKeys.thread(threadId),
    (data) => (data ? { ...data, title } : data),
  );
}
