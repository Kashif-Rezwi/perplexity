import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteThread } from '@/lib/api';
import { useHistoryStore } from '@/store/historyStore';
import { useRouter, usePathname } from 'next/navigation';

export function useThreadMutations() {
  const queryClient = useQueryClient();
  const removeThreadFromStore = useHistoryStore((state) => state.removeThread);
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

      // Navigate away if we are on the deleted thread's page
      if (pathname === `/thread/${threadId}`) {
        router.push('/');
      }
    },
  });

  return {
    deleteThread: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
