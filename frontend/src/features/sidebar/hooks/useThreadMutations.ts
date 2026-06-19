import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { deleteThread, deleteThreads, renameThread } from '@/lib/api';
import {
  removeThreadFromThreadListCaches,
  removeThreadsFromThreadListCaches,
  updateThreadDetailCacheTitle,
  updateThreadInThreadListCaches,
} from '@/lib/api/threadListCache';
import { mapThreadSummaryToHistoryItem } from '@/lib/mappers/thread-summary.mapper';
import { useHistoryStore } from '@/store/historyStore';

export function useThreadMutations() {
  const queryClient = useQueryClient();
  const addThreadToStore = useHistoryStore((state) => state.addThread);
  const removeThreadFromStore = useHistoryStore((state) => state.removeThread);
  const removeThreadsFromStore = useHistoryStore((state) => state.removeThreads);
  const router = useRouter();
  const pathname = usePathname();

  const deleteMutation = useMutation({
    mutationFn: (threadId: string) => deleteThread(threadId),
    onSuccess: (_, threadId) => {
      // Remove from local storage
      removeThreadFromStore(threadId);

      // Clear from cache
      queryClient.removeQueries({ queryKey: ['thread', threadId] });
      queryClient.removeQueries({ queryKey: ['sources', threadId] });
      removeThreadFromThreadListCaches(queryClient, threadId);

      // Navigate away if we are on the deleted thread's page
      if (pathname === `/thread/${threadId}`) {
        router.push('/');
      }
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (threadIds: string[]) => deleteThreads(threadIds),
    onSuccess: (_result, threadIds) => {
      removeThreadsFromStore(threadIds);
      removeThreadsFromThreadListCaches(queryClient, threadIds);

      for (const threadId of threadIds) {
        queryClient.removeQueries({ queryKey: ['thread', threadId] });
        queryClient.removeQueries({ queryKey: ['sources', threadId] });
      }

      const currentThreadId = pathname.startsWith('/thread/')
        ? pathname.replace('/thread/', '')
        : null;

      if (currentThreadId && threadIds.includes(currentThreadId)) {
        router.push('/');
      }
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ threadId, title }: { threadId: string; title: string }) =>
      renameThread(threadId, title),
    onSuccess: (thread) => {
      addThreadToStore(mapThreadSummaryToHistoryItem(thread));
      updateThreadInThreadListCaches(queryClient, thread);
      updateThreadDetailCacheTitle(queryClient, thread.threadId, thread.title);
    },
  });

  return {
    deleteThread: deleteMutation.mutate,
    deleteThreadAsync: deleteMutation.mutateAsync,
    deleteThreads: bulkDeleteMutation.mutate,
    deleteThreadsAsync: bulkDeleteMutation.mutateAsync,
    renameThread: renameMutation.mutate,
    renameThreadAsync: renameMutation.mutateAsync,
    isDeleting: deleteMutation.isPending || bulkDeleteMutation.isPending,
    isRenaming: renameMutation.isPending,
  };
}
