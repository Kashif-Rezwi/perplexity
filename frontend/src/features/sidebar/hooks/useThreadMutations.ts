import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { deleteThread, deleteThreads, renameThread, toggleThreadPin } from '@/lib/api';
import {
  invalidateUnpinnedThreadListCaches,
  removeThreadsFromManagedCaches,
  restoreThreadCaches,
  snapshotThreadCaches,
  shouldRefetchUnpinnedThreadLists,
  updateThreadDetailCacheTitle,
  updateThreadInThreadListCaches,
  updateThreadPinInCaches,
  updateThreadPinOptimistically,
} from '@/lib/api/threadListCache';
import { mapThreadSummaryToHistoryItem } from '@/lib/mappers/thread-summary.mapper';
import { useHistoryStore } from '@/store/historyStore';

export function useThreadMutations() {
  const queryClient = useQueryClient();
  const addThreadToStore = useHistoryStore((state) => state.addThread);
  const removeThreadsFromStore = useHistoryStore((state) => state.removeThreads);
  const router = useRouter();
  const pathname = usePathname();

  const removeDeletedThreads = (threadIds: string[]) => {
    removeThreadsFromStore(threadIds);
    removeThreadsFromManagedCaches(queryClient, threadIds);
  };

  const navigateAwayFromDeletedThread = (threadIds: string[]) => {
    const currentThreadId = pathname.startsWith('/thread/')
      ? pathname.replace('/thread/', '')
      : null;

    if (currentThreadId && threadIds.includes(currentThreadId)) {
      router.push('/');
    }
  };

  const applyRenamedThread = (thread: Awaited<ReturnType<typeof renameThread>>) => {
    addThreadToStore(mapThreadSummaryToHistoryItem(thread));
    updateThreadInThreadListCaches(queryClient, thread);
    updateThreadDetailCacheTitle(queryClient, thread.threadId, thread.title);
  };

  const applyPinnedThread = async (
    thread: Awaited<ReturnType<typeof toggleThreadPin>>,
  ) => {
    const shouldRefetchUnpinned =
      !thread.isPinned &&
      shouldRefetchUnpinnedThreadLists(queryClient, thread.threadId);

    addThreadToStore(mapThreadSummaryToHistoryItem(thread));
    updateThreadPinInCaches(queryClient, thread);

    if (shouldRefetchUnpinned) {
      await invalidateUnpinnedThreadListCaches(queryClient);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (threadId: string) => deleteThread(threadId),
    onSuccess: (_, threadId) => {
      removeDeletedThreads([threadId]);
      navigateAwayFromDeletedThread([threadId]);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (threadIds: string[]) => deleteThreads(threadIds),
    onSuccess: (_result, threadIds) => {
      removeDeletedThreads(threadIds);
      navigateAwayFromDeletedThread(threadIds);
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ threadId, title }: { threadId: string; title: string }) =>
      renameThread(threadId, title),
    onSuccess: (thread) => {
      applyRenamedThread(thread);
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ threadId, isPinned }: { threadId: string; isPinned: boolean }) =>
      toggleThreadPin(threadId, isPinned),
    onMutate: async ({ threadId, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: ['threads'] });

      const previousThreadCaches = snapshotThreadCaches(queryClient);
      updateThreadPinOptimistically(queryClient, threadId, isPinned);

      return { previousThreadCaches };
    },
    onError: (_err, _newPin, context) => {
      if (context?.previousThreadCaches) {
        restoreThreadCaches(queryClient, context.previousThreadCaches);
      }
    },
    onSuccess: async (thread) => {
      if (thread) {
        await applyPinnedThread(thread);
      }
    },
  });

  return {
    deleteThread: deleteMutation.mutate,
    deleteThreadAsync: deleteMutation.mutateAsync,
    deleteThreads: bulkDeleteMutation.mutate,
    deleteThreadsAsync: bulkDeleteMutation.mutateAsync,
    renameThread: renameMutation.mutate,
    renameThreadAsync: renameMutation.mutateAsync,
    togglePin: pinMutation.mutate,
    togglePinAsync: pinMutation.mutateAsync,
    isDeleting: deleteMutation.isPending || bulkDeleteMutation.isPending,
    isRenaming: renameMutation.isPending,
    isPinning: pinMutation.isPending,
    deletingThreadId: deleteMutation.variables,
    renamingThreadId: renameMutation.variables?.threadId,
    pinningThreadId: pinMutation.variables?.threadId,
  };
}
