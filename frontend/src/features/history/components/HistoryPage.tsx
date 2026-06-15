'use client';

import { useState } from 'react';
import { useHistoryStore } from '@/store/historyStore';
import { useMounted } from '@/hooks/useMounted';
import type { HistoryTypeFilter, SortOrder } from '../constants/history.constants';
import { useHistorySearch } from '../hooks/useHistorySearch';
import { useHistorySelection } from '../hooks/useHistorySelection';
import { useVisibleHistoryThreads } from '../hooks/useVisibleHistoryThreads';
import { HistoryFiltersBar } from './HistoryFiltersBar';
import { HistoryList } from './HistoryList';
import { HistoryToolbar } from './HistoryToolbar';

export function HistoryPage() {
  const mounted = useMounted();
  const threads = useHistoryStore((state) => state.threads);
  const removeThread = useHistoryStore((state) => state.removeThread);
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const {
    isSearchOpen,
    searchQuery,
    searchInputRef,
    searchContainerRef,
    openSearch,
    closeSearch,
    setSearchQuery,
  } = useHistorySearch();
  const {
    selectedThreadIds,
    toggleThreadSelection,
    clearSelection,
  } = useHistorySelection();

  const visibleThreads = useVisibleHistoryThreads({
    threads,
    typeFilter,
    sortOrder,
    searchQuery,
  });

  const deleteSelectedThreads = () => {
    selectedThreadIds.forEach((threadId) => removeThread(threadId));
    clearSelection();
  };

  const handleTypeFilterChange = (value: HistoryTypeFilter) => {
    setTypeFilter(value);
    clearSelection();
  };

  if (!mounted) {
    return (
      <main className="flex h-full w-full items-center justify-center text-sm text-[var(--color-text-muted)]">
        Loading history...
      </main>
    );
  }

  return (
    <main className="h-full w-full overflow-hidden bg-[var(--color-bg)]">
      <div className="flex h-full flex-col">
        <HistoryToolbar
          selectedCount={selectedThreadIds.size}
          isSearchOpen={isSearchOpen}
          searchQuery={searchQuery}
          searchContainerRef={searchContainerRef}
          searchInputRef={searchInputRef}
          onOpenSearch={openSearch}
          onCloseSearch={closeSearch}
          onSearchQueryChange={setSearchQuery}
          onDeleteSelected={deleteSelectedThreads}
          onClearSelection={clearSelection}
        />

        <HistoryFiltersBar
          typeFilter={typeFilter}
          sortOrder={sortOrder}
          onTypeFilterChange={handleTypeFilterChange}
          onSortOrderChange={setSortOrder}
        />

        <section className="min-h-0 flex-1 overflow-y-auto px-3 py-1.5">
          <HistoryList
            threads={visibleThreads}
            selectedThreadIds={selectedThreadIds}
            onToggleSelection={toggleThreadSelection}
          />
        </section>
      </div>
    </main>
  );
}
