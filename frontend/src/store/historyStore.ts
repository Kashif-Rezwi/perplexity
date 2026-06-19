import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThreadHistoryItem = {
  id: string;
  title: string;
  mode?: 'web' | 'deep-research';
  updatedAt?: string;
};

const MAX_THREAD_HISTORY_ITEMS = 50;

type HistoryStore = {
  threads: ThreadHistoryItem[];
  addThread: (thread: ThreadHistoryItem) => void;
  removeThread: (id: string) => void;
  removeThreads: (ids: string[]) => void;
};

function upsertThreadHistoryItem(
  threads: ThreadHistoryItem[],
  thread: ThreadHistoryItem
) {
  const existingIndex = threads.findIndex((item) => item.id === thread.id);

  if (
    existingIndex === 0 &&
    threads[0].title === thread.title &&
    threads[0].mode === thread.mode &&
    threads[0].updatedAt === thread.updatedAt
  ) {
    return threads;
  }

  if (existingIndex >= 0) {
    const existingThread = threads[existingIndex];
    if (
      existingThread.title === thread.title &&
      existingThread.mode === thread.mode &&
      existingThread.updatedAt === thread.updatedAt
    ) {
      return threads;
    }

    return threads.map((item, index) =>
      index === existingIndex ? { ...item, ...thread } : item
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
