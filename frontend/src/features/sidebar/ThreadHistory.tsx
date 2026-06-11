'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHistoryStore } from '@/store/historyStore';
import { useMounted } from '@/hooks/useMounted';

import { MessageSquare, Trash2 } from 'lucide-react';

type Props = {
  isOpen: boolean;
};

export function ThreadHistory({ isOpen }: Props) {
  const threads = useHistoryStore((state) => state.threads);
  const removeThread = useHistoryStore((state) => state.removeThread);
  const mounted = useMounted();
  const pathname = usePathname();
  const router = useRouter();

  if (!isOpen) {
    return <div className="flex-1 min-h-0" />;
  }

  if (!mounted) {
    return <div className="flex-1 min-h-0" />;
  }

  return (
    <div className="flex-1 overflow-y-auto py-2 min-h-0 flex flex-col px-2">
      <div className="flex flex-col gap-[2px]">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center select-none animate-in fade-in duration-300">
            <MessageSquare size={20} className="text-[var(--color-text-faint)] mb-2.5 stroke-[1.5]" />
            <span className="text-[12px] font-semibold text-[var(--color-text-muted)] mb-0.5">
              No recent history
            </span>
            <span className="text-[11px] text-[var(--color-text-faint)] leading-normal max-w-[150px] block">
              Your conversations will appear here.
            </span>
          </div>
        ) : (
          threads.map((thread) => {
            const isActive = pathname === `/thread/${thread.id}`;
            const handleDelete = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              removeThread(thread.id);
              if (isActive) {
                router.push('/');
              }
            };

            return (
              <div
                key={thread.id}
                className={[
                  'relative group flex items-center justify-between rounded-[8px] overflow-hidden whitespace-nowrap transition-colors duration-100 ease-linear',
                  isActive
                    ? 'bg-[var(--color-surface-active)]'
                    : 'hover:bg-[var(--color-surface-hover)]',
                ].join(' ')}
              >
                <Link
                  href={`/thread/${thread.id}`}
                  title={thread.title}
                  scroll={false}
                  className={[
                    'flex-1 text-[13px] font-normal leading-tight truncate pl-3 pr-8 py-2 no-underline transition-colors duration-100 ease-linear',
                    isActive
                      ? 'text-[var(--color-text)]'
                      : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]',
                  ].join(' ')}
                >
                  {thread.title}
                </Link>

                <button
                  type="button"
                  onClick={handleDelete}
                  aria-label={`Delete thread: ${thread.title}`}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 focus-within:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-error)] p-0.5 rounded transition-all duration-150 shrink-0 cursor-pointer"
                >
                  <Trash2 size={13} className="stroke-[1.5]" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
