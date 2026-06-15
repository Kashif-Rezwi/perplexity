import Link from 'next/link';
import type { RefObject } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';

type HistoryToolbarProps = {
  selectedCount: number;
  isSearchOpen: boolean;
  searchQuery: string;
  searchContainerRef: RefObject<HTMLDivElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
};

export function HistoryToolbar({
  selectedCount,
  isSearchOpen,
  searchQuery,
  searchContainerRef,
  searchInputRef,
  onOpenSearch,
  onCloseSearch,
  onSearchQueryChange,
  onDeleteSelected,
  onClearSelection,
}: HistoryToolbarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <header className="flex h-[70px] shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] px-6">
      <h1 className="text-[14px] font-medium text-[var(--color-text)]">
        {hasSelection ? `${selectedCount} selected` : 'History'}
      </h1>

      <div className="flex items-center gap-2">
        {hasSelection ? (
          <>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="flex h-8 w-[104px] items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-state-active)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Delete
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              className="flex h-8 w-[104px] items-center justify-center gap-1.5 rounded-lg bg-[var(--color-text)] px-2.5 text-xs font-medium text-[var(--color-bg)] transition-opacity hover:opacity-90"
            >
              <X size={14} strokeWidth={1.75} />
              Cancel
            </button>
          </>
        ) : (
          <>
            {isSearchOpen ? (
              <div
                ref={searchContainerRef}
                className="flex h-8 w-[260px] items-center gap-2 rounded-lg border border-[var(--color-border)] px-2.5 text-[var(--color-text-muted)]"
              >
                <Search size={15} strokeWidth={1.75} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') onCloseSearch();
                  }}
                  placeholder="Search sessions..."
                  className="min-w-0 flex-1 bg-transparent text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)]"
                />
                {searchQuery.trim().length > 0 && (
                  <button
                    type="button"
                    aria-label="Clear history search"
                    onClick={onCloseSearch}
                    className="grid size-5 shrink-0 place-items-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                  >
                    <X size={12} strokeWidth={1.9} />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                aria-label="Search history"
                onClick={onOpenSearch}
                className="flex size-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-state-hover)]"
              >
                <Search size={15} strokeWidth={1.75} />
              </button>
            )}

            <Link
              href="/"
              scroll={false}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-state-active)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Plus size={14} strokeWidth={1.75} />
              New Session
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

