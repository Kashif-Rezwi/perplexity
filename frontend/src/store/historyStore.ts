import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThreadHistoryItem = {
  id: string;
  title: string;
};

type HistoryStore = {
  threads: ThreadHistoryItem[];
  addThread: (thread: ThreadHistoryItem) => void;
  removeThread: (id: string) => void;
};

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      threads: [],
      addThread: (thread) =>
        set((state) => {
          // If the thread is already the most recent one with the same details,
          // return state unmodified to prevent unnecessary re-renders.
          if (
            state.threads.length > 0 &&
            state.threads[0].id === thread.id &&
            state.threads[0].title === thread.title
          ) {
            return state;
          }
          // Remove existing thread if it exists to avoid duplicates
          const filtered = state.threads.filter((t) => t.id !== thread.id);
          // Add to top of list
          return {
            threads: [thread, ...filtered],
          };
        }),
      removeThread: (id) =>
        set((state) => ({
          threads: state.threads.filter((t) => t.id !== id),
        })),
    }),
    {
      name: 'perplexity-history-storage',
    }
  )
);
