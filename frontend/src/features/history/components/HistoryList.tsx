import { useState } from 'react';
import type { ThreadHistoryItem } from '@/store/historyStore';
import type { HistoryEmptyState } from '../utils/historyEmptyState';
import { HistoryRow } from './HistoryRow';

type HistoryListProps = {
  threads: ThreadHistoryItem[];
  selectedThreadIds: Set<string>;
  onToggleSelection: (threadId: string) => void;
  onRenameThread: (thread: ThreadHistoryItem) => void;
  onDeleteThread: (thread: ThreadHistoryItem) => void;
  onTogglePinThread: (thread: ThreadHistoryItem) => void;
  isLoading?: boolean;
  isError?: boolean;
  emptyState: HistoryEmptyState;
};

export function HistoryList({
  threads,
  selectedThreadIds,
  onToggleSelection,
  onRenameThread,
  onDeleteThread,
  onTogglePinThread,
  isLoading = false,
  isError = false,
  emptyState,
}: HistoryListProps) {
  const [openMenuThreadId, setOpenMenuThreadId] = useState<string | null>(null);

  const handleActionMenuOpenChange = (threadId: string, isOpen: boolean) => {
    setOpenMenuThreadId((currentThreadId) => {
      if (isOpen) {
        return threadId;
      }

      return currentThreadId === threadId ? null : currentThreadId;
    });
  };

  if (isLoading) {
    return <HistoryListSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
        Could not load server history.
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
        {emptyState.message}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {threads.map((thread) => (
        <HistoryRow
          key={thread.id}
          thread={thread}
          isSelected={selectedThreadIds.has(thread.id)}
          hasSelection={selectedThreadIds.size > 0}
          onToggleSelection={onToggleSelection}
          onRenameThread={onRenameThread}
          onDeleteThread={onDeleteThread}
          onTogglePinThread={onTogglePinThread}
          isActionMenuOpen={openMenuThreadId === thread.id}
          onActionMenuOpenChange={handleActionMenuOpenChange}
        />
      ))}
    </ul>
  );
}

export function HistoryListSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-0.5 animate-in fade-in duration-200"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="grid min-h-[46px] grid-cols-[112px_minmax(0,1fr)_max-content_24px] items-center gap-4 rounded-[9px] border-b border-transparent px-3.5"
        >
          <div className="flex items-center gap-2.5">
            <div className="size-[15px] rounded-[4px] bg-[var(--color-surface-hover)] opacity-50 animate-pulse" />
            <div className="h-3 w-14 rounded bg-[var(--color-surface-hover)] opacity-50 animate-pulse" />
          </div>
          <div
            className={[
              'h-3.5 rounded bg-[var(--color-surface-hover)] opacity-50 animate-pulse',
              index % 3 === 0
                ? 'w-7/12'
                : index % 3 === 1
                  ? 'w-9/12'
                  : 'w-5/12',
            ].join(' ')}
          />
          <div className="h-3 w-16 justify-self-end rounded bg-[var(--color-surface-hover)] opacity-40 animate-pulse" />
          <div className="size-6 rounded-lg bg-[var(--color-surface-hover)] opacity-30 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
