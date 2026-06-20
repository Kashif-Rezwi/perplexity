import { useState } from 'react';
import type { ThreadHistoryItem } from '@/store/historyStore';
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
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
        Loading history...
      </div>
    );
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
        No chats match this filter.
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
