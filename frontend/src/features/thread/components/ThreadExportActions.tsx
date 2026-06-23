'use client';

import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import type { ThreadDetailResponse } from '@/types/api.types';
import { useEffect, useRef, useState } from 'react';
import { useThreadMutations } from '@/features/sidebar/hooks/useThreadMutations';
import {
  ThreadDeleteDialog,
  ThreadRenameDialog,
} from '@/features/thread-management/components/ThreadManagementDialogs';
import { getThreadMutationErrorMessage } from '@/features/thread-management/utils/threadManagementErrors';

type ThreadExportActionsProps = {
  thread: ThreadDetailResponse;
};

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

  const {
    deleteThreadAsync,
    renameThreadAsync,
    isDeleting,
    isRenaming,
  } = useThreadMutations();

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState(thread.title);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const submitRename = async () => {
    const title = renameTitle.trim();
    if (title.length === 0) {
      setRenameError('Title is required.');
      return;
    }

    if (title.length > 80) {
      setRenameError('Title must be 80 characters or fewer.');
      return;
    }

    try {
      setRenameError(null);
      await renameThreadAsync({ threadId: thread.threadId, title });
      setIsRenameOpen(false);
    } catch (err) {
      setRenameError(getThreadMutationErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    try {
      setDeleteError(null);
      await deleteThreadAsync(thread.threadId);
      setIsDeleteOpen(false);
    } catch (err) {
      setDeleteError(getThreadMutationErrorMessage(err));
    }
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
                <span className="flex-shrink-0 text-[var(--color-text-faint)]">Created by</span>
                <span className="min-w-0 text-right text-[var(--color-text-muted)] truncate">
                  kashifrezwi8210 (You)
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 overflow-hidden">
                <span className="flex-shrink-0 text-[var(--color-text-faint)]">Last Updated</span>
                <span className="min-w-0 text-right text-[var(--color-text-muted)] truncate">
                  {formatMenuDate(thread.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--color-border-subtle)] my-1 mx-1.5" />

          {/* Group 1: Spaces & Rename */}
          <div className="flex flex-col">
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm text-[var(--color-text-faint)] cursor-not-allowed opacity-40"
            >
              <Plus size={16} strokeWidth={1.75} className="shrink-0" />
              Add to Space
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setRenameTitle(thread.title);
                setRenameError(null);
                setIsRenameOpen(true);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Pencil size={16} strokeWidth={1.75} className="shrink-0" />
              Rename Session
            </button>
          </div>

          <div className="border-t border-[var(--color-border-subtle)] my-1 mx-1.5" />

          {/* Group 2: Exports */}
          <div className="flex flex-col">
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm text-[var(--color-text-faint)] cursor-not-allowed opacity-40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <text
                  x="5"
                  y="18"
                  fontSize="5"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  fill="currentColor"
                  stroke="none"
                >
                  PDF
                </text>
              </svg>
              Export as PDF
            </button>
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm text-[var(--color-text-faint)] cursor-not-allowed opacity-40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <text
                  x="6"
                  y="18"
                  fontSize="6"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  fill="currentColor"
                  stroke="none"
                >
                  M↓
                </text>
              </svg>
              Export as Markdown
            </button>
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm text-[var(--color-text-faint)] cursor-not-allowed opacity-40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <text
                  x="5"
                  y="18"
                  fontSize="5"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  fill="currentColor"
                  stroke="none"
                >
                  DOCX
                </text>
              </svg>
              Export as DOCX
            </button>
          </div>

          <div className="border-t border-[var(--color-border-subtle)] my-1 mx-1.5" />

          {/* Group 3: Delete */}
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsDeleteOpen(true);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left text-sm text-[var(--color-error)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <Trash2 size={16} strokeWidth={1.75} className="shrink-0 text-[var(--color-error)]" />
              Delete
            </button>
          </div>
        </div>
      )}

      <ThreadRenameDialog
        thread={isRenameOpen ? { title: thread.title } : null}
        titleValue={renameTitle}
        error={renameError}
        isSubmitting={isRenaming}
        inputId="topbar-rename-thread-title"
        onTitleChange={setRenameTitle}
        onClose={() => setIsRenameOpen(false)}
        onSubmit={() => void submitRename()}
      />

      <ThreadDeleteDialog
        thread={isDeleteOpen ? { title: thread.title } : null}
        error={deleteError}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
