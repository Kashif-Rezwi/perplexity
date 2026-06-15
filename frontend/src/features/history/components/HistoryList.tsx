import type { ThreadHistoryItem } from '@/store/historyStore';
import { HistoryRow } from './HistoryRow';

type HistoryListProps = {
  threads: ThreadHistoryItem[];
  selectedThreadIds: Set<string>;
  onToggleSelection: (threadId: string) => void;
};

export function HistoryList({
  threads,
  selectedThreadIds,
  onToggleSelection,
}: HistoryListProps) {
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
          onToggleSelection={onToggleSelection}
        />
      ))}
    </ul>
  );
}

