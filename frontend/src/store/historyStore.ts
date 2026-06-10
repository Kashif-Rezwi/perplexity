import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThreadHistoryItem = {
  id: string;
  title: string;
};

type HistoryStore = {
  threads: ThreadHistoryItem[];
  addThread: (thread: ThreadHistoryItem) => void;
};

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      threads: [],
      addThread: (thread) =>
        set((state) => {
          // Remove existing thread if it exists to avoid duplicates
          const filtered = state.threads.filter((t) => t.id !== thread.id);
          // Add to top of list
          return {
            threads: [thread, ...filtered],
          };
        }),
    }),
    {
      name: 'perplexity-history-storage',
    }
  )
);
