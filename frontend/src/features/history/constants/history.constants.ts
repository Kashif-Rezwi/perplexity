export type HistoryTypeFilter = 'all' | 'web' | 'deep-research';
export type SortOrder = 'newest' | 'oldest';

export const HISTORY_TYPE_FILTERS: Array<{
  value: HistoryTypeFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'web', label: 'Search' },
  { value: 'deep-research', label: 'Deep research' },
];

export const HISTORY_SORT_OPTIONS: Array<{
  value: SortOrder;
  label: string;
}> = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

