import Link from 'next/link';
import { Check, Search, Telescope } from 'lucide-react';
import type { ThreadHistoryItem } from '@/store/historyStore';
import { formatRelativeDate, getThreadMode } from '../utils/historyItems';

type HistoryRowProps = {
  thread: ThreadHistoryItem;
  isSelected: boolean;
  onToggleSelection: (threadId: string) => void;
};

export function HistoryRow({
  thread,
  isSelected,
  onToggleSelection,
}: HistoryRowProps) {
  const mode = getThreadMode(thread);
  const ModeIcon = mode === 'deep-research' ? Telescope : Search;

  return (
    <li
      className={[
        'group grid min-h-[46px] grid-cols-[112px_minmax(0,1fr)_max-content] items-center gap-4 rounded-[9px] border-b px-3.5 transition-colors',
        isSelected
          ? 'border-[var(--color-selection-border)] bg-[var(--color-selection-surface)] hover:bg-[var(--color-selection-surface)]'
          : 'border-transparent hover:bg-[var(--color-surface-hover)]',
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-2.5 text-[12.5px] font-normal text-[var(--color-text-muted)]">
        <span className="relative grid size-[15px] shrink-0 place-items-center">
          <ModeIcon
            size={15}
            strokeWidth={1.75}
            className={[
              'transition-opacity duration-100',
              isSelected ? 'opacity-0' : 'opacity-100 group-hover:opacity-0',
            ].join(' ')}
          />
          <button
            type="button"
            aria-label={
              isSelected
                ? `Deselect ${thread.title}`
                : `Select ${thread.title}`
            }
            onClick={() => onToggleSelection(thread.id)}
            className={[
              'absolute left-1/2 top-1/2 grid size-[13px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[3px] border transition-opacity duration-100',
              isSelected
                ? 'border-[var(--color-selection-check)] bg-[var(--color-selection-check)] text-[var(--color-selection-check-icon)] opacity-100'
                : 'border-[var(--color-border)] bg-transparent text-transparent opacity-0 group-hover:opacity-100',
            ].join(' ')}
          >
            <Check size={8} strokeWidth={2.25} />
          </button>
        </span>
        <span className="truncate">
          {mode === 'deep-research' ? 'Deep research' : 'Search'}
        </span>
      </div>

      <Link
        href={`/thread/${thread.id}`}
        scroll={false}
        className="block w-full min-w-0 justify-self-stretch truncate py-2 text-[14px] font-normal text-[var(--color-text)] no-underline transition-colors"
      >
        {thread.title}
      </Link>

      <time className="justify-self-end whitespace-nowrap text-[12.5px] text-[var(--color-text-muted)]">
        {formatRelativeDate(thread)}
      </time>
    </li>
  );
}

