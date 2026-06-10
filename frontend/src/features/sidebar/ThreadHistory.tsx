'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useHistoryStore } from '@/store/historyStore';
import { useMounted } from '@/hooks/useMounted';

type Props = {
  isOpen: boolean;
};

export function ThreadHistory({ isOpen }: Props) {
  const threads = useHistoryStore((state) => state.threads);
  const mounted = useMounted();
  const pathname = usePathname();

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
          <p className="text-[12px] text-[var(--color-text-faint)] px-2 py-1 leading-relaxed select-none">
            No recent sessions
          </p>
        ) : (
          threads.map((thread) => {
            const isActive = pathname === `/thread/${thread.id}`;
            return (
              <Link
                key={thread.id}
                href={`/thread/${thread.id}`}
                title={thread.title}
                className={[
                  'flex items-center rounded-[8px] no-underline overflow-hidden whitespace-nowrap',
                  'transition-colors duration-100 ease-linear px-3 py-2',
                  isActive
                    ? 'bg-[var(--color-surface-active)] text-[var(--color-text)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]',
                ].join(' ')}
              >
                <span className="text-[13px] font-normal leading-tight truncate">
                  {thread.title}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
