import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, MoreHorizontal, Pencil, Search, Telescope, Trash2 } from 'lucide-react';
import type { ThreadHistoryItem } from '@/store/historyStore';
import { formatRelativeDate, getThreadMode } from '../utils/historyItems';

type HistoryRowProps = {
  thread: ThreadHistoryItem;
  isSelected: boolean;
  hasSelection: boolean;
  onToggleSelection: (threadId: string) => void;
  onRenameThread: (thread: ThreadHistoryItem) => void;
  onDeleteThread: (thread: ThreadHistoryItem) => void;
};

export function HistoryRow({
  thread,
  isSelected,
  hasSelection,
  onToggleSelection,
  onRenameThread,
  onDeleteThread,
}: HistoryRowProps) {
  const mode = getThreadMode(thread);
  const ModeIcon = mode === 'deep-research' ? Telescope : Search;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <li
      className={[
        'group grid min-h-[46px] grid-cols-[112px_minmax(0,1fr)_max-content_24px] items-center gap-4 rounded-[9px] border-b px-3.5 transition-colors',
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
            onClick={() => {
              setIsMenuOpen(false);
              onToggleSelection(thread.id);
            }}
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

      <div ref={menuRef} className="relative flex justify-end">
        {!hasSelection && (
          <button
            type="button"
            aria-label={`Open actions for ${thread.title}`}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
            className={[
              'grid size-6 place-items-center rounded-md text-[var(--color-text-muted)] transition-colors',
              'hover:bg-[var(--color-surface-active)] hover:text-[var(--color-text)]',
              isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            ].join(' ')}
          >
            <MoreHorizontal size={15} strokeWidth={1.75} />
          </button>
        )}

        {!hasSelection && isMenuOpen && (
          <div className="absolute right-0 top-7 z-30 w-32 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onRenameThread(thread);
              }}
              className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-xs text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Pencil size={13} strokeWidth={1.75} />
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onDeleteThread(thread);
              }}
              className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-xs text-[var(--color-error)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Trash2 size={13} strokeWidth={1.75} />
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
