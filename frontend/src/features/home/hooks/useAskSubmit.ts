import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getSources } from '@/lib/api';
import { streamAsk } from '@/lib/api';
import { ApiError, NetworkError } from '@/lib/api/client';
import { mapAskTurnToTurnItem } from '@/lib/mappers/ask.mapper';
import { useHistoryStore } from '@/store/historyStore';
import type {
  AskResponse,
  AskStreamStartEvent,
  ThreadDetailResponse,
  TurnItem,
} from '@/types/api.types';

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

function createStreamingTurn(event: AskStreamStartEvent): TurnItem {
  const now = new Date().toISOString();

  return {
    turnId: event.turnId,
    question: event.question,
    searchQuery: event.searchQuery,
    answerMarkdown: '',
    suggestedFollowUpQuestions: [],
    status: 'pending',
    errorMessage: null,
    sourceCount: 0,
    citationCount: 0,
    sources: [],
    citations: [],
    createdAt: now,
    completedAt: null,
  };
}

function createStreamingThread(event: AskStreamStartEvent): ThreadDetailResponse {
  const now = new Date().toISOString();

  return {
    threadId: event.threadId,
    title: event.question,
    status: 'running',
    mode: 'web',
    answerPreview: null,
    isPinned: false,
    pinnedAt: null,
    totalSourceCount: 0,
    turnCount: 1,
    createdAt: now,
    updatedAt: now,
    turns: [createStreamingTurn(event)],
  };
}

export function useAskSubmit({
  threadId,
  onSubmitStart,
  onSettled,
}: UseAskSubmitOptions = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const addThread = useHistoryStore((state) => state.addThread);

  function applyFinalResponse(data: AskResponse) {
    const targetThreadId = data.thread.threadId;
    const completedTurn = mapAskTurnToTurnItem(data.turn);

    addThread({
      id: data.thread.threadId,
      title: data.thread.title,
      mode: data.thread.mode,
      updatedAt: data.thread.updatedAt,
      isPinned: data.thread.isPinned,
    });

    queryClient.setQueryData<ThreadDetailResponse>(
      ['thread', targetThreadId],
      (existing) => {
        if (!existing) {
          return {
            ...data.thread,
            turns: [completedTurn],
          };
        }

        const turnAlreadyPresent = existing.turns.some(
          (turn) => turn.turnId === completedTurn.turnId,
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
                turn.turnId === completedTurn.turnId ? completedTurn : turn,
              )
            : [...existing.turns, completedTurn],
        };
      },
    );

    void queryClient.prefetchQuery({
      queryKey: ['sources', targetThreadId, data.turn.turnId],
      queryFn: () => getSources({ turnId: data.turn.turnId }),
    });

    void queryClient.invalidateQueries({ queryKey: ['threads'] });
  }

  const mutation = useMutation({
    mutationFn: async (variables: AskMutationInput) => {
      const { question, threadId: overrideThreadId } = variables;
      const activeThreadId = overrideThreadId ?? threadId;
      let streamThreadId = activeThreadId;
      let streamTurnId: string | null = null;

      await streamAsk(question, activeThreadId, {
        onStart: (event) => {
          streamThreadId = event.threadId;
          streamTurnId = event.turnId;
          onSettled?.();

          if (!activeThreadId) {
            addThread({
              id: event.threadId,
              title: event.question,
              mode: 'web',
              updatedAt: new Date().toISOString(),
            });

            queryClient.setQueryData<ThreadDetailResponse>(
              ['thread', event.threadId],
              createStreamingThread(event),
            );
            router.push(`/thread/${event.threadId}`);
            return;
          }

          queryClient.setQueryData<ThreadDetailResponse>(
            ['thread', activeThreadId],
            (existing) => {
              if (!existing) return existing;
              const turnAlreadyPresent = existing.turns.some(
                (turn) => turn.turnId === event.turnId,
              );

              return {
                ...existing,
                status: 'running',
                turnCount: turnAlreadyPresent
                  ? existing.turnCount
                  : existing.turnCount + 1,
                turns: turnAlreadyPresent
                  ? existing.turns
                  : [...existing.turns, createStreamingTurn(event)],
              };
            },
          );
        },
        onDelta: (text) => {
          if (!streamThreadId || !streamTurnId) return;

          queryClient.setQueryData<ThreadDetailResponse>(
            ['thread', streamThreadId],
            (existing) => {
              if (!existing) return existing;

              return {
                ...existing,
                turns: existing.turns.map((turn) =>
                  turn.turnId === streamTurnId
                    ? {
                        ...turn,
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
        onError: (message) => {
          if (!streamThreadId || !streamTurnId) return;

          queryClient.setQueryData<ThreadDetailResponse>(
            ['thread', streamThreadId],
            (existing) => {
              if (!existing) return existing;

              return {
                ...existing,
                status: 'failed',
                turns: existing.turns.map((turn) =>
                  turn.turnId === streamTurnId
                    ? {
                        ...turn,
                        status: 'failed',
                        errorMessage: message,
                      }
                    : turn,
                ),
              };
            },
          );
        },
      });
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
