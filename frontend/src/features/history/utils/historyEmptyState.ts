import type { HistoryTypeFilter } from '../constants/history.constants';

export type HistoryEmptyState = {
  message: string;
};

type GetHistoryEmptyStateInput = {
  searchQuery: string;
  typeFilter: HistoryTypeFilter;
};

export function getHistoryEmptyState({
  searchQuery,
  typeFilter,
}: GetHistoryEmptyStateInput): HistoryEmptyState {
  if (searchQuery.trim()) {
    return { message: 'No chats match this search.' };
  }

  if (typeFilter !== 'all') {
    return { message: 'No chats match this filter.' };
  }

  return { message: 'No chats yet.' };
}
