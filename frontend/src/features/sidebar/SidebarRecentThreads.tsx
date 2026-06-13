'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useHistoryStore } from '@/store/historyStore';

type Props = {
  isOpen: boolean;
};

export function SidebarRecentThreads({ isOpen }: Props) {
  const threads = useHistoryStore((state) => state.threads);
  const removeThread = useHistoryStore((state) => state.removeThread);
  const mounted = useMounted();
  const pathname = usePathname();
  const router = useRouter();

  if (!isOpen || !mounted || threads.length === 0) {
    return <div className="min-h-0 flex-1" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-1">
      <div className="flex flex-col gap-px">
        {threads.map((thread) => {
          const isActive = pathname === `/thread/${thread.id}`;

          const handleDelete = (event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            removeThread(thread.id);

            if (isActive) {
              router.push('/');
            }
          };

          return (
            <div
              key={thread.id}
              className={[
                'group relative flex h-7 items-center overflow-hidden rounded-lg whitespace-nowrap transition-colors duration-100 ease-linear',
                isActive
                  ? 'bg-white/[0.025]'
                  : 'hover:bg-[var(--color-surface-hover)]',
              ].join(' ')}
            >
              <Link
                href={`/thread/${thread.id}`}
                title={thread.title}
                scroll={false}
                className={[
                  'min-w-0 flex-1 truncate py-1 pl-3 pr-8 text-xs font-normal leading-none no-underline transition-colors duration-100 ease-linear',
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
                className="absolute right-2 rounded p-0.5 text-[var(--color-text-muted)] opacity-0 transition-all duration-150 hover:text-[var(--color-error)] focus:opacity-100 group-hover:opacity-100"
              >
                <Trash2 size={12} strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
