import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { postAsk } from '@/lib/api/ask.api';
import { getSources } from '@/lib/api/sources.api';
import { ApiError, NetworkError } from '@/lib/api/client';
import { mapAskTurnToTurnItem } from '@/lib/mappers/ask.mapper';
import { useHistoryStore } from '@/store/historyStore';
import type { ThreadDetailResponse } from '@/types/api.types';

type AskMutationInput = {
  question: string;
  threadId?: string;
};

type UseAskSubmitOptions = {
  threadId?: string;
  onSubmitStart?: (question: string) => void;
  onSettled?: () => void;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof NetworkError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Failed to connect to the server.';
}

export function useAskSubmit({
  threadId,
  onSubmitStart,
  onSettled,
}: UseAskSubmitOptions = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const addThread = useHistoryStore((state) => state.addThread);

  const mutation = useMutation({
    mutationFn: ({ question, threadId: overrideThreadId }: AskMutationInput) =>
      postAsk(question, overrideThreadId ?? threadId),
    onSuccess: (data, variables) => {
      const activeThreadId = variables.threadId ?? threadId;

      if (!activeThreadId) {
        addThread({
          id: data.thread.threadId,
          title: data.thread.title,
          mode: data.thread.mode,
          updatedAt: data.thread.updatedAt,
        });

        queryClient.setQueryData<ThreadDetailResponse>(
          ['thread', data.thread.threadId],
          {
            ...data.thread,
            turns: [mapAskTurnToTurnItem(data.turn)],
          },
        );

        void queryClient.prefetchQuery({
          queryKey: ['sources', data.thread.threadId, data.turn.turnId],
          queryFn: () => getSources({ turnId: data.turn.turnId }),
        });

        router.push(`/thread/${data.thread.threadId}`);
        return;
      }

      queryClient.setQueryData<ThreadDetailResponse>(
        ['thread', activeThreadId],
        (existing) => {
          if (!existing) return existing;

          const newTurn = mapAskTurnToTurnItem(data.turn);
          const turnAlreadyPresent = existing.turns.some(
            (turn) => turn.turnId === newTurn.turnId,
          );

          return {
            ...existing,
            title: data.thread.title,
            status: data.thread.status,
            answerPreview: data.thread.answerPreview,
            totalSourceCount: data.thread.totalSourceCount,
            turnCount: data.thread.turnCount,
            updatedAt: data.thread.updatedAt,
            turns: turnAlreadyPresent
              ? existing.turns.map((turn) =>
                  turn.turnId === newTurn.turnId ? newTurn : turn,
                )
              : [...existing.turns, newTurn],
          };
        },
      );

      void queryClient.prefetchQuery({
        queryKey: ['sources', activeThreadId, data.turn.turnId],
        queryFn: () => getSources({ turnId: data.turn.turnId }),
      });

      void queryClient.invalidateQueries({ queryKey: ['thread', activeThreadId] });
    },
    onError: async (_error, variables) => {
      const activeThreadId = variables.threadId ?? threadId;
      if (!activeThreadId) return;

      await queryClient.refetchQueries({ queryKey: ['thread', activeThreadId] });
      const updated = queryClient.getQueryData<ThreadDetailResponse>([
        'thread',
        activeThreadId,
      ]);

      const questionWasPersisted = updated?.turns.some(
        (turn) => turn.question === variables.question && turn.status !== 'pending',
      );

      if (questionWasPersisted) {
        mutation.reset();
      }
    },
    onSettled,
  });

  const submitAsk = (question: string, overrideThreadId?: string) => {
    if (!question || mutation.isPending) return false;

    mutation.reset();
    onSubmitStart?.(question);
    mutation.mutate({ question, threadId: overrideThreadId ?? threadId });
    return true;
  };

  return {
    submitAsk,
    isPending: mutation.isPending,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
    reset: mutation.reset,
  };
}
