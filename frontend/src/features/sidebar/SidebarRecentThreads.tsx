'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useHistoryStore } from '@/store/historyStore';
import { useThreadMutations } from './hooks/useThreadMutations';
import { Modal } from '@/components/ui/Modal';

type Props = {
  isOpen: boolean;
};

export function SidebarRecentThreads({ isOpen }: Props) {
  const threads = useHistoryStore((state) => state.threads);
  const mounted = useMounted();
  const pathname = usePathname();
  const { deleteThread, isDeleting } = useThreadMutations();

  // State for Delete Modal
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  if (!isOpen || !mounted || threads.length === 0) {
    return <div className="min-h-0 flex-1" />;
  }

  const handleDeleteConfirm = () => {
    if (deleteModalId) {
      deleteThread(deleteModalId);
      setDeleteModalId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-1 relative">
      <div className="flex flex-col gap-px">
        {threads.map((thread) => {
          const isActive = pathname === `/thread/${thread.id}`;
          const isModalOpen = deleteModalId === thread.id;

          return (
            <div
              key={thread.id}
              className={[
                'group relative flex h-7 items-center overflow-hidden rounded-lg whitespace-nowrap transition-colors duration-100 ease-linear',
                isActive || isModalOpen
                  ? 'bg-[var(--color-surface-active-faint)]'
                  : 'hover:bg-[var(--color-surface-hover)]',
              ].join(' ')}
            >
              <Link
                href={`/thread/${thread.id}`}
                title={thread.title}
                scroll={false}
                className={[
                  'min-w-0 flex-1 truncate py-1 pl-3 pr-8 text-xs font-normal leading-none no-underline transition-colors duration-100 ease-linear',
                  isActive || isModalOpen
                    ? 'text-[var(--color-text)]'
                    : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]',
                ].join(' ')}
              >
                {thread.title}
              </Link>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteModalId(thread.id);
                }}
                disabled={isDeleting}
                aria-label={`Delete thread: ${thread.title}`}
                className={[
                  'absolute right-1.5 rounded p-0.5 text-[var(--color-text-muted)] transition-all duration-150',
                  'hover:text-[var(--color-error)] disabled:opacity-50',
                  isModalOpen ? 'opacity-100 text-[var(--color-error)]' : 'opacity-0 group-hover:opacity-100'
                ].join(' ')}
              >
                <Trash2 size={12} strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        title="Delete Thread"
      >
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Are you sure you want to delete this thread? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteModalId(null)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            className="rounded-lg bg-[var(--color-error)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
