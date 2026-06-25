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
  onDeleteSelected: () => void | Promise<void>;
  onClearSelection: () => void;
  isDeleting?: boolean;
  disabled?: boolean;
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
  isDeleting = false,
  disabled = false,
}: HistoryToolbarProps) {
  const hasSelection = selectedCount > 0;
  const controlsDisabled = disabled || isDeleting;

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
              onClick={() => void onDeleteSelected()}
              disabled={controlsDisabled}
              className="flex h-8 w-[104px] items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-state-active)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent"
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Delete
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              disabled={controlsDisabled}
              className="flex h-8 w-[104px] items-center justify-center gap-1.5 rounded-lg bg-[var(--color-text)] px-2.5 text-xs font-medium text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
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
	                  disabled={disabled}
	                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') onCloseSearch();
                  }}
                  placeholder="Search sessions..."
	                  className="min-w-0 flex-1 bg-transparent text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)] disabled:cursor-not-allowed disabled:opacity-60"
                />
                {searchQuery.trim().length > 0 && (
                  <button
	                    type="button"
	                    aria-label="Clear history search"
	                    onClick={onCloseSearch}
	                    disabled={disabled}
	                    className="grid size-5 shrink-0 place-items-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]"
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
                disabled={disabled}
                className="flex size-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-state-hover)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]"
              >
                <Search size={15} strokeWidth={1.75} />
              </button>
            )}

            <Link
              href="/"
	              scroll={false}
	              aria-disabled={disabled}
	              tabIndex={disabled ? -1 : undefined}
	              className={[
	                'flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-state-active)] transition-colors hover:bg-[var(--color-surface-hover)]',
	                disabled
	                  ? 'pointer-events-none cursor-not-allowed opacity-55 hover:bg-transparent'
	                  : '',
	              ].join(' ')}
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
