'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ThreadActionMenu } from '@/features/thread-management/components/ThreadActionMenu';
import {
  ThreadDeleteDialog,
  ThreadRenameDialog,
} from '@/features/thread-management/components/ThreadManagementDialogs';
import { useThreadActionDialogs } from '@/features/thread-management/hooks/useThreadActionDialogs';
import { useMounted } from '@/hooks/useMounted';
import { getThreads } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';
import { mapThreadSummaryToHistoryItem } from '@/lib/mappers/thread-summary.mapper';
import type { ThreadHistoryItem } from '@/store/historyStore';
import { useHistoryStore } from '@/store/historyStore';
import type { ThreadListResponse } from '@/types/api.types';
import { getSidebarThreadViewState } from './utils/sidebarThreads';

type Props = {
  isOpen: boolean;
  isCollapsed: boolean;
};

const SIDEBAR_THREAD_LIMIT = 20;

export function SidebarRecentThreads({ isOpen, isCollapsed }: Props) {
  const localThreads = useHistoryStore((state) => state.threads);
  const mounted = useMounted();
  const pathname = usePathname();
  const threadActions = useThreadActionDialogs({
    renameInputId: 'sidebar-rename-thread-title',
  });
  const {
    togglePinAsync,
    deletingThreadId,
    renamingThreadId,
    pinningThreadId,
  } = threadActions;
  const threadListQuery = useInfiniteQuery<ThreadListResponse>({
    queryKey: queryKeys.threadsHistory({
      limit: SIDEBAR_THREAD_LIMIT,
      mode: 'all',
      q: '',
      sort: 'newest',
    }),
    queryFn: ({ pageParam }) => getThreads({
      limit: SIDEBAR_THREAD_LIMIT,
      cursor: typeof pageParam === 'string' ? pageParam : undefined,
      mode: 'all',
      sort: 'newest',
    }),
    enabled: isOpen && !isCollapsed,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    retry: 1,
  });

  const firstPage = threadListQuery.data?.pages[0];
  const serverThreads = (firstPage?.items ?? []).map(
    mapThreadSummaryToHistoryItem,
  );
  const {
    pinnedThreads: visiblePinnedThreads,
    recentThreads: visibleRecentThreads,
    isLoading,
  } = getSidebarThreadViewState({
    serverThreads,
    localThreads,
    hasServerData: Boolean(firstPage),
    isPending: threadListQuery.isPending,
    isError: threadListQuery.isError,
    limit: SIDEBAR_THREAD_LIMIT,
  });
  const visibleThreadCount =
    visiblePinnedThreads.length + visibleRecentThreads.length;

  const [openMenuThreadId, setOpenMenuThreadId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const [isScrolledTop, setIsScrolledTop] = useState(false);
  const [isScrolledBottom, setIsScrolledBottom] = useState(false);

  useEffect(() => {
    if (!mounted || !isOpen || isCollapsed) return;
    const container = scrollContainerRef.current;
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;

    if (!container || !topSentinel || !bottomSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === topSentinel) {
            setIsScrolledTop(!entry.isIntersecting);
          } else if (entry.target === bottomSentinel) {
            setIsScrolledBottom(!entry.isIntersecting);
          }
        });
      },
      {
        root: container,
        threshold: 0,
      }
    );

    observer.observe(topSentinel);
    observer.observe(bottomSentinel);

    return () => observer.disconnect();
  }, [mounted, isOpen, isCollapsed, visibleThreadCount]);

  if (
    !isOpen ||
    !mounted ||
    isCollapsed ||
    (visibleThreadCount === 0 && !isLoading)
  ) {
    return <div className="min-h-0 flex-1" />;
  }

  const renderThread = (thread: ThreadHistoryItem) => {
    const isActive = pathname === `/thread/${thread.id}`;
    const isDialogOpen =
      openMenuThreadId === thread.id ||
      threadActions.renameDialogProps.thread?.id === thread.id ||
      threadActions.deleteDialogProps.thread?.id === thread.id;

    return (
      <div
        key={thread.id}
        className={[
          'group relative flex h-7 items-center overflow-hidden rounded-lg transition-colors duration-100 ease-linear',
          isActive || isDialogOpen
            ? 'bg-[var(--color-surface-active-faint)]'
            : 'hover:bg-[var(--color-surface-hover)]',
        ].join(' ')}
      >
        <Link
          href={`/thread/${thread.id}`}
          title={thread.title}
          scroll={false}
          className={[
            'min-w-0 flex-1 truncate py-1 pl-3 pr-7 text-xs font-normal leading-none no-underline transition-colors duration-100 ease-linear',
            isActive || isDialogOpen
              ? 'text-[var(--color-text)]'
              : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]',
          ].join(' ')}
        >
          {thread.title}
        </Link>

        <ThreadActionMenu
          threadTitle={thread.title}
          isPinned={thread.isPinned ?? false}
          isOpen={openMenuThreadId === thread.id}
          disabled={
            deletingThreadId === thread.id ||
            renamingThreadId === thread.id ||
            pinningThreadId === thread.id
          }
          onTogglePin={() => void togglePinAsync({ threadId: thread.id, isPinned: !(thread.isPinned ?? false) })}
          onRename={() => threadActions.openRenameDialog(thread)}
          onDelete={() => threadActions.openDeleteDialog(thread)}
          className="absolute right-1 top-1/2 z-20 flex -translate-y-1/2 justify-end"
          buttonClassName="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          onOpenChange={(isMenuOpen) => {
            setOpenMenuThreadId((currentThreadId) => {
              if (isMenuOpen) {
                return thread.id;
              }

              return currentThreadId === thread.id ? null : currentThreadId;
            });
          }}
        />
      </div>
    );
  };

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden py-1">
      <div
        className={[
          'h-full transition-all duration-200',
          isScrolledTop && isScrolledBottom ? 'sidebar-mask-both' :
          isScrolledTop ? 'sidebar-mask-top' :
          isScrolledBottom ? 'sidebar-mask-bottom' : ''
        ].join(' ')}
      >
        <div
          ref={scrollContainerRef}
          className="sidebar-thread-scrollbar relative h-full overflow-y-auto"
        >
          <div ref={topSentinelRef} className="h-px w-full" />
          <div className="flex flex-col pb-4 pl-2 pr-3">
            {visiblePinnedThreads.length > 0 && (
              <div className="mb-2 flex flex-col gap-px border-b border-[var(--color-border-subtle)] pb-2">
                <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
                  Pinned
                </div>
                {visiblePinnedThreads.map(renderThread)}
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col gap-1 px-1 py-1" aria-hidden="true">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="flex h-7 items-center rounded-lg px-3"
                  >
                    <div
                      className={[
                        'h-3 rounded bg-[var(--color-surface-hover)] opacity-40 animate-pulse',
                        index === 0 ? 'w-8/12' : index === 1 ? 'w-7/12' : 'w-9/12',
                      ].join(' ')}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-px">
              {visibleRecentThreads.map(renderThread)}
            </div>
            <div ref={bottomSentinelRef} className="h-px w-full" />
          </div>
        </div>
      </div>

      <ThreadRenameDialog {...threadActions.renameDialogProps} />

      <ThreadDeleteDialog {...threadActions.deleteDialogProps} />
    </div>
  );
}
