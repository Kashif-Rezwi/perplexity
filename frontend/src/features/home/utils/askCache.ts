import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryKeys';
import { mapAskTurnToTurnItem } from '@/lib/mappers/ask.mapper';
import type { ThreadHistoryItem } from '@/store/historyStore';
import type {
  AskResponse,
  AskStreamErrorEvent,
  AskStreamStartEvent,
  ThreadDetailResponse,
  TurnItem,
} from '@/types/api.types';

type AddThreadToHistory = (thread: ThreadHistoryItem) => void;

export function createStreamingTurn(event: AskStreamStartEvent): TurnItem {
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
    streamStage: 'preparing',
    streamMessage: 'Preparing your question...',
    createdAt: now,
    completedAt: null,
  };
}

export function createStreamingThread(
  event: AskStreamStartEvent,
): ThreadDetailResponse {
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

export function applyFinalAskResponse(
  queryClient: QueryClient,
  addThread: AddThreadToHistory,
  data: AskResponse,
) {
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
    queryKeys.thread(targetThreadId),
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
        ...data.thread,
        turns: turnAlreadyPresent
          ? existing.turns.map((turn) =>
              turn.turnId === completedTurn.turnId ? completedTurn : turn,
            )
          : [...existing.turns, completedTurn],
      };
    },
  );
}

export function appendStreamingTurnToThread(
  queryClient: QueryClient,
  threadId: string,
  event: AskStreamStartEvent,
) {
  queryClient.setQueryData<ThreadDetailResponse>(
    queryKeys.thread(threadId),
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
}

export function updateStreamingTurn(
  queryClient: QueryClient,
  threadId: string,
  turnId: string,
  patch: Partial<TurnItem>,
) {
  queryClient.setQueryData<ThreadDetailResponse>(
    queryKeys.thread(threadId),
    (existing) => {
      if (!existing) return existing;

      return {
        ...existing,
        turns: existing.turns.map((turn) =>
          turn.turnId === turnId ? { ...turn, ...patch } : turn,
        ),
      };
    },
  );
}

export function markStreamingTurnFailed(
  queryClient: QueryClient,
  threadId: string,
  turnId: string,
  error: AskStreamErrorEvent,
) {
  queryClient.setQueryData<ThreadDetailResponse>(
    queryKeys.thread(threadId),
    (existing) => {
      if (!existing) return existing;

      return {
        ...existing,
        status: 'failed',
        turns: existing.turns.map((turn) =>
          turn.turnId === turnId
            ? {
                ...turn,
                status: 'failed',
                streamStage: null,
                streamMessage: null,
                errorMessage: error.message,
              }
            : turn,
        ),
      };
    },
  );
}

export function hasPersistedTurn(
  thread: ThreadDetailResponse | undefined,
  turnId: string,
): boolean {
  return Boolean(
    thread?.turns.some(
      (turn) => turn.turnId === turnId && turn.status !== 'pending',
    ),
  );
}
