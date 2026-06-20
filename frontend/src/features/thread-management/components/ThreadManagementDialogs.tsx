import { Modal } from '@/components/ui/Modal';

type ThreadDialogTarget = {
  title: string;
};

type ThreadRenameDialogProps = {
  thread: ThreadDialogTarget | null;
  titleValue: string;
  error: string | null;
  isSubmitting: boolean;
  inputId: string;
  onTitleChange: (title: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

type ThreadDeleteDialogProps = {
  thread: ThreadDialogTarget | null;
  error: string | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ThreadRenameDialog({
  thread,
  titleValue,
  error,
  isSubmitting,
  inputId,
  onTitleChange,
  onClose,
  onSubmit,
}: ThreadRenameDialogProps) {
  return (
    <Modal
      isOpen={thread !== null}
      onClose={onClose}
      title="Rename thread"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="space-y-1.5">
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[var(--color-text-muted)]"
          >
            Title
          </label>
          <input
            id={inputId}
            type="text"
            value={titleValue}
            maxLength={80}
            onChange={(event) => onTitleChange(event.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-border-strong)]"
            autoFocus
          />
          {error && (
            <p className="text-xs text-[var(--color-error)]">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8 rounded-lg px-3 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || titleValue.trim().length === 0}
            className="h-8 rounded-lg bg-[var(--color-text)] px-3 text-xs font-medium text-[var(--color-bg)] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Renaming...' : 'Rename'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ThreadDeleteDialog({
  thread,
  error,
  isDeleting,
  onClose,
  onConfirm,
}: ThreadDeleteDialogProps) {
  return (
    <Modal
      isOpen={thread !== null}
      onClose={onClose}
      title="Delete thread"
    >
      <div className="space-y-4">
        <p className="text-sm leading-5 text-[var(--color-text-muted)]">
          Delete “{thread?.title}”? This removes the thread from history.
        </p>
        {error && (
          <p className="text-xs text-[var(--color-error)]">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-8 rounded-lg px-3 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-8 rounded-lg bg-[var(--color-error)] px-3 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
