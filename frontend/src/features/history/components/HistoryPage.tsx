'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  ThreadDeleteDialog,
  ThreadRenameDialog,
} from '@/features/thread-management/components/ThreadManagementDialogs';
import { getThreadMutationErrorMessage } from '@/features/thread-management/utils/threadManagementErrors';
import { useThreadMutations } from '@/features/sidebar/hooks/useThreadMutations';
import { useHistoryStore } from '@/store/historyStore';
import type { ThreadHistoryItem } from '@/store/historyStore';
import { useMounted } from '@/hooks/useMounted';
import type { HistoryTypeFilter, SortOrder } from '../constants/history.constants';
import { useHistorySearch } from '../hooks/useHistorySearch';
import { useHistorySelection } from '../hooks/useHistorySelection';
import { useServerHistoryThreads } from '../hooks/useServerHistoryThreads';
import { HistoryFiltersBar } from './HistoryFiltersBar';
import { HistoryList } from './HistoryList';
import { HistoryToolbar } from './HistoryToolbar';

export function HistoryPage() {
  const mounted = useMounted();
  const threads = useHistoryStore((state) => state.threads);
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [threadToRename, setThreadToRename] =
    useState<ThreadHistoryItem | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [threadToDelete, setThreadToDelete] =
    useState<ThreadHistoryItem | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const {
    deleteThreadAsync,
    deleteThreadsAsync,
    renameThreadAsync,
    togglePin,
    isDeleting,
    isRenaming,
  } = useThreadMutations();
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

  const openRenameDialog = (thread: ThreadHistoryItem) => {
    setThreadToRename(thread);
    setRenameTitle(thread.title);
    setRenameError(null);
  };

  const closeRenameDialog = () => {
    if (isRenaming) return;
    setThreadToRename(null);
    setRenameTitle('');
    setRenameError(null);
  };

  const submitRename = async () => {
    if (!threadToRename) return;

    const title = renameTitle.trim();
    if (title.length === 0) {
      setRenameError('Title is required.');
      return;
    }

    if (title.length > 80) {
      setRenameError('Title must be 80 characters or fewer.');
      return;
    }

    try {
      setRenameError(null);
      await renameThreadAsync({ threadId: threadToRename.id, title });
      closeRenameDialog();
    } catch (error) {
      setRenameError(getThreadMutationErrorMessage(error));
    }
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setThreadToDelete(null);
    setDeleteError(null);
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

  const confirmSingleDelete = async () => {
    if (!threadToDelete) return;

    try {
      setDeleteError(null);
      await deleteThreadAsync(threadToDelete.id);
      setThreadToDelete(null);
    } catch (error) {
      setDeleteError(getThreadMutationErrorMessage(error));
    }
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
            onRenameThread={openRenameDialog}
            onDeleteThread={setThreadToDelete}
            onTogglePinThread={handleTogglePinThread}
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

      <ThreadRenameDialog
        thread={threadToRename}
        titleValue={renameTitle}
        error={renameError}
        isSubmitting={isRenaming}
        inputId="rename-thread-title"
        onTitleChange={setRenameTitle}
        onClose={closeRenameDialog}
        onSubmit={() => void submitRename()}
      />

      <ThreadDeleteDialog
        thread={threadToDelete}
        error={deleteError}
        isDeleting={isDeleting}
        onClose={closeDeleteDialog}
        onConfirm={() => void confirmSingleDelete()}
      />

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
