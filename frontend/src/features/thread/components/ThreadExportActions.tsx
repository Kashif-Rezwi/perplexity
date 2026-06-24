'use client';

import { Copy, FileText, Link2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { ThreadDetailResponse } from '@/types/api.types';
import { useEffect, useRef, useState } from 'react';
import {
  ThreadDeleteDialog,
  ThreadRenameDialog,
} from '@/features/thread-management/components/ThreadManagementDialogs';
import { useThreadActionDialogs } from '@/features/thread-management/hooks/useThreadActionDialogs';
import { copyTextToClipboard } from '@/lib/utils/clipboard';
import {
  createThreadUrl,
  serializeThreadMarkdown,
  serializeThreadPlainText,
} from '../utils/threadExport';

type ThreadExportActionsProps = {
  thread: ThreadDetailResponse;
};

type CopiedAction = 'url' | 'markdown' | 'text';

function formatMenuDate(value?: string) {
  if (!value) return 'Just now';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return 'Just now';
  }
}

export function ThreadExportActions({ thread }: ThreadExportActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const copiedTimerRef = useRef<number | null>(null);

  const threadActions = useThreadActionDialogs({
    renameInputId: 'topbar-rename-thread-title',
  });
  const [copiedAction, setCopiedAction] = useState<CopiedAction | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const copyValue = async (action: CopiedAction, value: string) => {
    const didCopy = await copyTextToClipboard(value);

    if (!didCopy) {
      return;
    }

    setCopiedAction(action);

    if (copiedTimerRef.current) {
      window.clearTimeout(copiedTimerRef.current);
    }

    copiedTimerRef.current = window.setTimeout(() => {
      setCopiedAction(null);
    }, 1600);
  };

  return (
    <div ref={menuRef} className="relative ml-auto hidden sm:block shrink-0">
      <button
        type="button"
        aria-label="Open thread actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={[
          'flex h-10 w-10 items-center justify-center rounded-[14px] transition-colors',
          isOpen
            ? 'bg-[var(--color-surface-active)] text-[var(--color-text)]'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]',
        ].join(' ')}
      >
        <MoreHorizontal size={18} strokeWidth={2} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-[260px] rounded-xl border border-[var(--color-border)] bg-[var(--color-sidebar)] p-1 shadow-2xl focus:outline-none"
        >
          {/* Header */}
          <div className="px-1.5 pt-2 pb-2.5">
            <p className="line-clamp-3 text-sm font-medium leading-[1.3] text-[var(--color-text)] select-none">
              {thread.title}
            </p>
            <div className="mt-2.5 flex flex-col gap-1.5 text-xs font-normal">
              <div className="flex items-center justify-between gap-4 overflow-hidden">
                <span className="flex-shrink-0 text-[var(--color-text-faint)]">Last Updated</span>
                <span className="min-w-0 text-right text-[var(--color-text-muted)] truncate">
                  {formatMenuDate(thread.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--color-border-subtle)] my-1 mx-1.5" />

          {/* Copy actions */}
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => void copyValue('url', createThreadUrl(thread.threadId))}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Link2 size={16} strokeWidth={1.75} className="shrink-0" />
              Copy thread URL
            </button>
            <button
              type="button"
              onClick={() =>
                void copyValue('markdown', serializeThreadMarkdown(thread))
              }
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Copy size={16} strokeWidth={1.75} className="shrink-0" />
              Copy Markdown
            </button>
            <button
              type="button"
              onClick={() =>
                void copyValue('text', serializeThreadPlainText(thread))
              }
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <FileText size={16} strokeWidth={1.75} className="shrink-0" />
              Copy plain text
            </button>
            {copiedAction && (
              <p
                aria-live="polite"
                className="px-2 pb-1 pt-1 text-xs font-medium text-[var(--color-accent)]"
              >
                Copied {copiedAction === 'url' ? 'URL' : copiedAction}
              </p>
            )}
          </div>

          <div className="border-t border-[var(--color-border-subtle)] my-1 mx-1.5" />

          {/* Manage actions */}
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                threadActions.openRenameDialog({
                  id: thread.threadId,
                  title: thread.title,
                });
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Pencil size={16} strokeWidth={1.75} className="shrink-0" />
              Rename Session
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                threadActions.openDeleteDialog({
                  id: thread.threadId,
                  title: thread.title,
                });
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left text-sm text-[var(--color-error)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Trash2 size={16} strokeWidth={1.75} className="shrink-0 text-[var(--color-error)]" />
              Delete
            </button>
          </div>
        </div>
      )}

      <ThreadRenameDialog {...threadActions.renameDialogProps} />

      <ThreadDeleteDialog {...threadActions.deleteDialogProps} />
    </div>
  );
}
