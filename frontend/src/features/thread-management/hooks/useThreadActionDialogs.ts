import { useState } from 'react';
import { getThreadMutationErrorMessage } from '../utils/threadManagementErrors';
import { useThreadMutations } from './useThreadMutations';

export type ThreadActionDialogTarget = {
  id: string;
  title: string;
};

type UseThreadActionDialogsOptions = {
  renameInputId: string;
};

export function useThreadActionDialogs({
  renameInputId,
}: UseThreadActionDialogsOptions) {
  const mutations = useThreadMutations();
  const [threadToRename, setThreadToRename] =
    useState<ThreadActionDialogTarget | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [threadToDelete, setThreadToDelete] =
    useState<ThreadActionDialogTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openRenameDialog(thread: ThreadActionDialogTarget) {
    setThreadToRename(thread);
    setRenameTitle(thread.title);
    setRenameError(null);
  }

  function closeRenameDialog() {
    if (mutations.isRenaming) return;
    setThreadToRename(null);
    setRenameTitle('');
    setRenameError(null);
  }

  async function submitRename() {
    if (!threadToRename) return;

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
      await mutations.renameThreadAsync({ threadId: threadToRename.id, title });
      closeRenameDialog();
    } catch (error) {
      setRenameError(getThreadMutationErrorMessage(error));
    }
  }

  function openDeleteDialog(thread: ThreadActionDialogTarget) {
    setThreadToDelete(thread);
    setDeleteError(null);
  }

  function closeDeleteDialog() {
    if (mutations.isDeleting) return;
    setThreadToDelete(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!threadToDelete) return;

    try {
      setDeleteError(null);
      await mutations.deleteThreadAsync(threadToDelete.id);
      setThreadToDelete(null);
    } catch (error) {
      setDeleteError(getThreadMutationErrorMessage(error));
    }
  }

  return {
    ...mutations,
    openRenameDialog,
    openDeleteDialog,
    renameDialogProps: {
      thread: threadToRename,
      titleValue: renameTitle,
      error: renameError,
      isSubmitting: mutations.isRenaming,
      inputId: renameInputId,
      onTitleChange: setRenameTitle,
      onClose: closeRenameDialog,
      onSubmit: () => void submitRename(),
    },
    deleteDialogProps: {
      thread: threadToDelete,
      error: deleteError,
      isDeleting: mutations.isDeleting,
      onClose: closeDeleteDialog,
      onConfirm: () => void confirmDelete(),
    },
  };
}
