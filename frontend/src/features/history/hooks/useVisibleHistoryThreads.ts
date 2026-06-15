import { useMemo } from 'react';
import type { ThreadHistoryItem } from '@/store/historyStore';
import type { HistoryTypeFilter, SortOrder } from '../constants/history.constants';
import { getThreadMode, getThreadTime } from '../utils/historyItems';

type UseVisibleHistoryThreadsInput = {
  threads: ThreadHistoryItem[];
  typeFilter: HistoryTypeFilter;
  sortOrder: SortOrder;
  searchQuery: string;
};

export function useVisibleHistoryThreads({
  threads,
  typeFilter,
  sortOrder,
  searchQuery,
}: UseVisibleHistoryThreadsInput) {
  return useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return threads
      .filter((thread) => {
        if (typeFilter === 'all') return true;
        return getThreadMode(thread) === typeFilter;
      })
      .filter((thread) => {
        if (!normalizedSearchQuery) return true;
        return thread.title.toLowerCase().includes(normalizedSearchQuery);
      })
      .slice()
      .sort((a, b) => {
        const diff = getThreadTime(b) - getThreadTime(a);
        return sortOrder === 'newest' ? diff : -diff;
      });
  }, [threads, typeFilter, sortOrder, searchQuery]);
}

