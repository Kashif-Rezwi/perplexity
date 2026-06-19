'use client';

import { useState } from 'react';
import { useHistoryStore } from '@/store/historyStore';
import { useMounted } from '@/hooks/useMounted';
import type { HistoryTypeFilter, SortOrder } from '../constants/history.constants';
import { useHistorySearch } from '../hooks/useHistorySearch';
import { useHistorySelection } from '../hooks/useHistorySelection';
import { useServerHistoryThreads } from '../hooks/useServerHistoryThreads';
import { HistoryFiltersBar } from './HistoryFiltersBar';
import { HistoryList } from './HistoryList';
import { HistoryToolbar } from './HistoryToolbar';
import { useThreadMutations } from '@/features/sidebar/hooks/useThreadMutations';

export function HistoryPage() {
  const mounted = useMounted();
  const threads = useHistoryStore((state) => state.threads);
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const { deleteThreadAsync, isDeleting } = useThreadMutations();
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

  const historyThreads = useServerHistoryThreads({
    localThreads: threads,
    typeFilter,
    sortOrder,
    searchQuery,
  });

  const deleteSelectedThreads = async () => {
    for (const threadId of selectedThreadIds) {
      await deleteThreadAsync(threadId);
    }
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
          isDeleting={isDeleting}
        />

        <HistoryFiltersBar
          typeFilter={typeFilter}
          sortOrder={sortOrder}
          onTypeFilterChange={handleTypeFilterChange}
          onSortOrderChange={setSortOrder}
        />

        <section className="min-h-0 flex-1 overflow-y-auto px-3 py-1.5">
          <HistoryList
            threads={historyThreads.threads}
            selectedThreadIds={selectedThreadIds}
            onToggleSelection={toggleThreadSelection}
            isLoading={historyThreads.isLoading}
            isError={historyThreads.isError}
          />
          {historyThreads.hasNextPage && (
            <div className="flex justify-center py-4">
              <button
                type="button"
                onClick={() => void historyThreads.fetchNextPage()}
                disabled={historyThreads.isFetchingNextPage}
                className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-state-hover)] disabled:opacity-60"
              >
                {historyThreads.isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
