'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  ThreadDeleteDialog,
  ThreadRenameDialog,
} from '@/features/thread-management/components/ThreadManagementDialogs';
import { useThreadActionDialogs } from '@/features/thread-management/hooks/useThreadActionDialogs';
import { getThreadMutationErrorMessage } from '@/features/thread-management/utils/threadManagementErrors';
import { useHistoryStore } from '@/store/historyStore';
import type { ThreadHistoryItem } from '@/store/historyStore';
import { useMounted } from '@/hooks/useMounted';
import type { HistoryTypeFilter, SortOrder } from '../constants/history.constants';
import { useHistorySearch } from '../hooks/useHistorySearch';
import { useHistorySelection } from '../hooks/useHistorySelection';
import { useServerHistoryThreads } from '../hooks/useServerHistoryThreads';
import { getHistoryEmptyState } from '../utils/historyEmptyState';
import { HistoryFiltersBar } from './HistoryFiltersBar';
import { HistoryList, HistoryListSkeleton } from './HistoryList';
import { HistoryToolbar } from './HistoryToolbar';

export function HistoryPage() {
  const mounted = useMounted();
  const threads = useHistoryStore((state) => state.threads);
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const threadActions = useThreadActionDialogs({
    renameInputId: 'rename-thread-title',
  });
  const {
    deleteThreadsAsync,
    togglePin,
    isDeleting,
  } = threadActions;
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

  const selectedCount = selectedThreadIds.size;
  const historyEmptyState = getHistoryEmptyState({
    searchQuery,
    typeFilter,
  });
  const areHistoryControlsDisabled = !mounted || historyThreads.isLoading;

  const deleteSelectedThreads = async () => {
    try {
      setDeleteError(null);
      await deleteThreadsAsync(Array.from(selectedThreadIds));
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      setDeleteError(getThreadMutationErrorMessage(error));
    }
  };

  const handleTypeFilterChange = (value: HistoryTypeFilter) => {
    setTypeFilter(value);
    clearSelection();
    setIsBulkDeleteDialogOpen(false);
  };

  const handleTogglePinThread = (thread: ThreadHistoryItem) => {
    togglePin({ threadId: thread.id, isPinned: !(thread.isPinned ?? false) });
  };

  const openBulkDeleteDialog = () => {
    if (selectedCount === 0) return;
    setDeleteError(null);
    setIsBulkDeleteDialogOpen(true);
  };

  const closeBulkDeleteDialog = () => {
    if (isDeleting) return;
    setIsBulkDeleteDialogOpen(false);
    setDeleteError(null);
  };

  return (
    <main className="h-full w-full overflow-hidden bg-[var(--color-bg)]">
      <div className="flex h-full flex-col">
        <HistoryToolbar
          selectedCount={selectedCount}
          isSearchOpen={isSearchOpen}
          searchQuery={searchQuery}
          searchContainerRef={searchContainerRef}
          searchInputRef={searchInputRef}
          onOpenSearch={openSearch}
          onCloseSearch={closeSearch}
          onSearchQueryChange={setSearchQuery}
          onDeleteSelected={openBulkDeleteDialog}
          onClearSelection={() => {
            clearSelection();
            setIsBulkDeleteDialogOpen(false);
            setDeleteError(null);
          }}
          isDeleting={isDeleting}
          disabled={areHistoryControlsDisabled}
        />

        <HistoryFiltersBar
          typeFilter={typeFilter}
          sortOrder={sortOrder}
          onTypeFilterChange={handleTypeFilterChange}
          onSortOrderChange={setSortOrder}
          disabled={areHistoryControlsDisabled}
        />

        <section className="min-h-0 flex-1 overflow-y-auto px-3 py-1.5">
          {!mounted ? (
            <HistoryListSkeleton />
          ) : (
            <HistoryList
              threads={historyThreads.threads}
              selectedThreadIds={selectedThreadIds}
              onToggleSelection={toggleThreadSelection}
              onRenameThread={threadActions.openRenameDialog}
              onDeleteThread={threadActions.openDeleteDialog}
              onTogglePinThread={handleTogglePinThread}
              isLoading={historyThreads.isLoading}
              isError={historyThreads.isError}
              emptyState={historyEmptyState}
            />
          )}
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

      <ThreadRenameDialog {...threadActions.renameDialogProps} />

      <ThreadDeleteDialog {...threadActions.deleteDialogProps} />

      <Modal
        isOpen={isBulkDeleteDialogOpen}
        onClose={closeBulkDeleteDialog}
        title="Delete selected threads"
      >
        <div className="space-y-4">
          <p className="text-sm leading-5 text-[var(--color-text-muted)]">
            Delete {selectedCount} selected{' '}
            {selectedCount === 1 ? 'thread' : 'threads'}? This removes them
            from history.
          </p>
          {deleteError && (
            <p className="text-xs text-[var(--color-error)]">{deleteError}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeBulkDeleteDialog}
              disabled={isDeleting}
              className="h-8 rounded-lg px-3 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void deleteSelectedThreads()}
              disabled={isDeleting || selectedCount === 0}
              className="h-8 rounded-lg bg-[var(--color-error)] px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
