import type {
  ThreadListModeFilter,
  ThreadListSort,
} from '@/types/api.types';

type HistoryThreadKeyInput = {
  limit: number;
  mode: ThreadListModeFilter;
  q: string;
  sort: ThreadListSort;
};

export const queryKeys = {
  threadsRoot: ['threads'] as const,
  thread: (threadId: string) => ['thread', threadId] as const,
  threadsHistory: (input: HistoryThreadKeyInput) =>
    ['threads', 'history', input] as const,
  sourcesForThread: (threadId: string) => ['sources', threadId] as const,
  sourcesForTurn: (threadId: string, turnId: string) =>
    ['sources', threadId, turnId] as const,
};
