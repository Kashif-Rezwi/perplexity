import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getSources, streamAsk, streamRetryAsk } from '@/lib/api';
import { ApiError, NetworkError } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/queryKeys';
import { useHistoryStore } from '@/store/historyStore';
import type {
  AskStreamErrorEvent,
  AskStreamHandlers,
  AskStreamProgressEvent,
  AskStreamStartEvent,
  ThreadDetailResponse,
} from '@/types/api.types';
import {
  appendStreamingTurnToThread,
  applyFinalAskResponse,
  createStreamingThread,
  hasPersistedTurn,
  markStreamingTurnFailed,
  updateStreamingTurn,
} from '../utils/askCache';

type AskMutationInput = {
  question: string;
  threadId?: string;
  retryTurnId?: string;
};

type UseAskSubmitOptions = {
  threadId?: string;
  onSubmitStart?: (question: string) => void;
  onStreamStart?: (event: AskStreamStartEvent) => void;
  onSettled?: () => void;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof NetworkError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Failed to connect to the server.';
}

class PersistedTurnError extends Error {
  constructor(
    error: unknown,
    public readonly threadId: string,
    public readonly turnId: string,
  ) {
    super(getErrorMessage(error));
    this.name = 'PersistedTurnError';
  }
}

export function useAskSubmit({
  threadId,
  onSubmitStart,
  onStreamStart,
  onSettled,
}: UseAskSubmitOptions = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const addThread = useHistoryStore((state) => state.addThread);

  function applyFinalResponse(data: Parameters<typeof applyFinalAskResponse>[2]) {
    const targetThreadId = data.thread.threadId;
    applyFinalAskResponse(queryClient, addThread, data);
    void queryClient.prefetchQuery({
      queryKey: queryKeys.sourcesForTurn(targetThreadId, data.turn.turnId),
      queryFn: () => getSources({ turnId: data.turn.turnId }),
    });

    void queryClient.invalidateQueries({ queryKey: queryKeys.threadsRoot });
  }

  const mutation = useMutation({
    mutationFn: async (variables: AskMutationInput) => {
      const { question, threadId: overrideThreadId, retryTurnId } = variables;
      const activeThreadId = overrideThreadId ?? threadId;
      let streamThreadId = activeThreadId;
      let streamTurnId: string | null = null;

      const handlers: AskStreamHandlers = {
        onStart: (event) => {
          streamThreadId = event.threadId;
          streamTurnId = event.turnId;

          if (!activeThreadId) {
            addThread({
              id: event.threadId,
              title: event.question,
              mode: 'web',
              updatedAt: new Date().toISOString(),
            });

            queryClient.setQueryData<ThreadDetailResponse>(
              queryKeys.thread(event.threadId),
              createStreamingThread(event),
            );
            onStreamStart?.(event);
            router.push(`/thread/${event.threadId}`);
            return;
          }

          appendStreamingTurnToThread(queryClient, activeThreadId, event);
          onStreamStart?.(event);
        },
        onProgress: (event: AskStreamProgressEvent) => {
          if (!streamThreadId || !streamTurnId) return;

          updateStreamingTurn(queryClient, streamThreadId, streamTurnId, {
            streamStage: event.stage,
            streamMessage: event.message,
          });
        },
        onDelta: (text) => {
          if (!streamThreadId || !streamTurnId) return;

          const targetTurnId = streamTurnId;
          queryClient.setQueryData<ThreadDetailResponse>(
            queryKeys.thread(streamThreadId),
            (existing) => {
              if (!existing) return existing;

              return {
                ...existing,
                turns: existing.turns.map((turn) =>
                  turn.turnId === targetTurnId
                    ? {
                        ...turn,
                        streamStage: 'answering',
                        streamMessage: 'Writing the answer...',
                        answerMarkdown: `${turn.answerMarkdown ?? ''}${text}`,
                      }
                    : turn,
                ),
              };
            },
          );
        },
        onFinal: (data) => {
          applyFinalResponse(data);
        },
        onError: (error: AskStreamErrorEvent) => {
          if (!streamThreadId || !streamTurnId) return;

          markStreamingTurnFailed(queryClient, streamThreadId, streamTurnId, error);
        },
      };

      try {
        if (retryTurnId && activeThreadId) {
          await streamRetryAsk(activeThreadId, retryTurnId, handlers);
          return;
        }

        await streamAsk(question, activeThreadId, handlers);
      } catch (error) {
        if (streamThreadId && streamTurnId) {
          throw new PersistedTurnError(error, streamThreadId, streamTurnId);
        }

        throw error;
      }
    },
    onError: async (error, variables) => {
      const persistedTurnError =
        error instanceof PersistedTurnError ? error : null;
      const activeThreadId =
        persistedTurnError?.threadId ?? variables.threadId ?? threadId;
      if (!activeThreadId || !persistedTurnError) return;

      await queryClient.refetchQueries({
        queryKey: queryKeys.thread(activeThreadId),
      });
      const updated = queryClient.getQueryData<ThreadDetailResponse>(
        queryKeys.thread(activeThreadId),
      );

      if (hasPersistedTurn(updated, persistedTurnError.turnId)) {
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

  const retryFailedTurn = (
    failedTurnId: string,
    question: string,
    overrideThreadId?: string,
  ) => {
    const activeThreadId = overrideThreadId ?? threadId;
    if (!activeThreadId || mutation.isPending) return false;

    mutation.reset();
    onSubmitStart?.(question);
    mutation.mutate({
      question,
      threadId: activeThreadId,
      retryTurnId: failedTurnId,
    });
    return true;
  };

  return {
    submitAsk,
    retryFailedTurn,
    isPending: mutation.isPending,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
    reset: mutation.reset,
  };
}
