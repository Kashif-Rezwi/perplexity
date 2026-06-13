'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Plus,
  Search,
  Telescope,
  Trash2,
  X,
} from 'lucide-react';
import { useHistoryStore, type ThreadHistoryItem } from '@/store/historyStore';
import { useMounted } from '@/hooks/useMounted';

type HistoryTypeFilter = 'all' | 'web' | 'deep-research';
type SortOrder = 'newest' | 'oldest';

const TYPE_FILTERS: Array<{ value: HistoryTypeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'web', label: 'Search' },
  { value: 'deep-research', label: 'Deep research' },
];

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

function getThreadTime(thread: ThreadHistoryItem) {
  const value = thread.updatedAt ? Date.parse(thread.updatedAt) : Number.NaN;
  return Number.isFinite(value) ? value : 0;
}

function formatRelativeDate(thread: ThreadHistoryItem) {
  const timestamp = getThreadTime(thread);

  if (!timestamp) {
    return 'recently';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

function getThreadMode(thread: ThreadHistoryItem): 'web' | 'deep-research' {
  return thread.mode === 'deep-research' ? 'deep-research' : 'web';
}

function SelectPill<T extends string>({
  label,
  value,
  options,
  onChange,
  align = 'left',
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  align?: 'left' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-6 items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
      >
        {selected.label}
        <ChevronDown size={12} strokeWidth={1.75} />
      </button>

      {isOpen && (
        <div
          className={[
            'absolute top-8 z-20 min-w-[144px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-2xl',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="flex h-8 w-full items-center justify-between rounded-xl px-2.5 text-left text-[13px] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={13} strokeWidth={1.75} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function HistoryPage() {
  const mounted = useMounted();
  const threads = useHistoryStore((state) => state.threads);
  const removeThread = useHistoryStore((state) => state.removeThread);
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(
    () => new Set(),
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const hasSearchText = searchQuery.trim().length > 0;
      if (hasSearchText) return;

      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isSearchOpen, searchQuery]);

  const visibleThreads = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    return threads
      .filter((thread) => {
        if (typeFilter === 'all') return true;
        return getThreadMode(thread) === typeFilter;
      })
      .filter((thread) => {
        if (!normalizedSearchQuery) return true;
        return thread.title.toLowerCase().includes(normalizedSearchQuery);
      })
      .slice()
      .sort((a, b) => {
        const diff = getThreadTime(b) - getThreadTime(a);
        return sortOrder === 'newest' ? diff : -diff;
      });
  }, [threads, typeFilter, sortOrder, searchQuery]);

  const hasSelection = selectedThreadIds.size > 0;

  const toggleThreadSelection = (threadId: string) => {
    setSelectedThreadIds((current) => {
      const next = new Set(current);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const deleteSelectedThreads = () => {
    selectedThreadIds.forEach((threadId) => removeThread(threadId));
    setSelectedThreadIds(new Set());
  };

  const clearSelection = () => {
    setSelectedThreadIds(new Set());
  };

  const closeSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
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
        <header className="flex h-[70px] shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] px-6">
          <h1 className="text-[14px] font-medium text-[var(--color-text)]">
            {hasSelection
              ? `${selectedThreadIds.size} selected`
              : 'History'}
          </h1>

          <div className="flex items-center gap-2">
            {hasSelection ? (
              <>
                <button
                  type="button"
                  onClick={deleteSelectedThreads}
                  className="flex h-8 w-[104px] items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                  Delete
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
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
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') closeSearch();
                      }}
                      placeholder="Search sessions..."
                      className="min-w-0 flex-1 bg-transparent text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)]"
                    />
                    {searchQuery.trim().length > 0 && (
                      <button
                        type="button"
                        aria-label="Clear history search"
                        onClick={closeSearch}
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
                    onClick={() => setIsSearchOpen(true)}
                    className="flex size-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                  >
                    <Search size={15} strokeWidth={1.75} />
                  </button>
                )}

                <Link
                  href="/"
                  scroll={false}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  <Plus size={14} strokeWidth={1.75} />
                  New Session
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="flex shrink-0 items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <SelectPill
              label="Filter history type"
              value={typeFilter}
              options={TYPE_FILTERS}
              onChange={(value) => {
                setTypeFilter(value);
                setSelectedThreadIds(new Set());
              }}
            />
          </div>

          <SelectPill
            label="Sort history"
            value={sortOrder}
            options={SORT_OPTIONS}
            onChange={setSortOrder}
            align="right"
          />
        </div>

        <section className="min-h-0 flex-1 overflow-y-auto px-3 py-1.5">
          {visibleThreads.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
              No chats match this filter.
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {visibleThreads.map((thread) => {
                const isSelected = selectedThreadIds.has(thread.id);
                const mode = getThreadMode(thread);
                const ModeIcon = mode === 'deep-research' ? Telescope : Search;

                return (
                  <li
                    key={thread.id}
                    className={[
                      'group grid min-h-[46px] grid-cols-[132px_minmax(0,1fr)_68px] items-center gap-3 rounded-[9px] border-b px-3.5 transition-colors',
                      isSelected
                        ? 'border-[#151a1a] bg-[var(--color-selection-surface)] hover:bg-[var(--color-selection-surface)]'
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
                          onClick={() => toggleThreadSelection(thread.id)}
                          className={[
                            'absolute left-1/2 top-1/2 grid size-[13px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[3px] border transition-opacity duration-100',
                            isSelected
                              ? 'border-[var(--color-selection-check)] bg-[var(--color-selection-check)] text-[#0f1716] opacity-100'
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
                      className="block w-full min-w-0 justify-self-stretch truncate py-2 text-[14px] font-normal text-[var(--color-text)] no-underline"
                    >
                      {thread.title}
                    </Link>

                    <time className="justify-self-end text-[12.5px] text-[var(--color-text-muted)]">
                      {formatRelativeDate(thread)}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
