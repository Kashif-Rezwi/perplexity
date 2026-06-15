import {
  HISTORY_SORT_OPTIONS,
  HISTORY_TYPE_FILTERS,
  type HistoryTypeFilter,
  type SortOrder,
} from '../constants/history.constants';
import { HistorySelectPill } from './HistorySelectPill';

type HistoryFiltersBarProps = {
  typeFilter: HistoryTypeFilter;
  sortOrder: SortOrder;
  onTypeFilterChange: (value: HistoryTypeFilter) => void;
  onSortOrderChange: (value: SortOrder) => void;
};

export function HistoryFiltersBar({
  typeFilter,
  sortOrder,
  onTypeFilterChange,
  onSortOrderChange,
}: HistoryFiltersBarProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 px-6 py-3">
      <div className="flex items-center gap-2">
        <HistorySelectPill
          label="Filter history type"
          value={typeFilter}
          options={HISTORY_TYPE_FILTERS}
          onChange={onTypeFilterChange}
        />
      </div>

      <HistorySelectPill
        label="Sort history"
        value={sortOrder}
        options={HISTORY_SORT_OPTIONS}
        onChange={onSortOrderChange}
        align="right"
      />
    </div>
  );
}

