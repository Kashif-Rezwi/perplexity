import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThreadHistoryItem = {
  id: string;
  title: string;
  mode?: 'web' | 'deep-research';
  isPinned?: boolean;
  updatedAt?: string;
};

const MAX_THREAD_HISTORY_ITEMS = 50;

type HistoryStore = {
  threads: ThreadHistoryItem[];
  addThread: (thread: ThreadHistoryItem) => void;
  removeThread: (id: string) => void;
  removeThreads: (ids: string[]) => void;
};

function getThreadHistoryTime(value?: string): number {
  if (!value) return 0;
  const time = Date.parse(value);

  return Number.isFinite(time) ? time : 0;
}

function getPreferredUpdatedAt(
  existingUpdatedAt: string | undefined,
  incomingUpdatedAt: string | undefined,
): string | undefined {
  return getThreadHistoryTime(incomingUpdatedAt) >
    getThreadHistoryTime(existingUpdatedAt)
    ? incomingUpdatedAt
    : existingUpdatedAt ?? incomingUpdatedAt;
}

function hasThreadHistoryItemChanged(
  current: ThreadHistoryItem,
  next: ThreadHistoryItem,
): boolean {
  return (
    current.title !== next.title ||
    current.mode !== next.mode ||
    current.isPinned !== next.isPinned ||
    current.updatedAt !== next.updatedAt
  );
}

export function upsertThreadHistoryItem(
  threads: ThreadHistoryItem[],
  thread: ThreadHistoryItem
) {
  const existingIndex = threads.findIndex((item) => item.id === thread.id);

  if (existingIndex >= 0) {
    const existingThread = threads[existingIndex];
    const mergedThread = {
      ...existingThread,
      ...thread,
      updatedAt: getPreferredUpdatedAt(
        existingThread.updatedAt,
        thread.updatedAt,
      ),
    };

    if (!hasThreadHistoryItemChanged(existingThread, mergedThread)) {
      return threads;
    }

    const shouldMoveToTop =
      getThreadHistoryTime(thread.updatedAt) >
      getThreadHistoryTime(existingThread.updatedAt);

    if (shouldMoveToTop) {
      return [
        mergedThread,
        ...threads.filter((item) => item.id !== thread.id),
      ].slice(0, MAX_THREAD_HISTORY_ITEMS);
    }

    return threads.map((item, index) =>
      index === existingIndex ? mergedThread : item
    );
  }

  return [thread, ...threads].slice(0, MAX_THREAD_HISTORY_ITEMS);
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      threads: [],
      addThread: (thread) =>
        set((state) => {
          const threads = upsertThreadHistoryItem(state.threads, thread);

          if (threads === state.threads) {
            return state;
          }

          return { threads };
        }),
      removeThread: (id) =>
        set((state) => ({
          threads: state.threads.filter((t) => t.id !== id),
        })),
      removeThreads: (ids) =>
        set((state) => {
          const idsToRemove = new Set(ids);
          return {
            threads: state.threads.filter((t) => !idsToRemove.has(t.id)),
          };
        }),
    }),
    {
      name: 'perplexity-history-storage',
    }
  )
);
