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

          // Check if thread already exists in the list
          const existingThread = state.threads.find((t) => t.id === thread.id);

          if (existingThread) {
            // If the title is also the same, return state unmodified to prevent re-renders
            if (existingThread.title === thread.title) {
              return state;
            }
            // Update the title in place without changing list order
            return {
              threads: state.threads.map((t) =>
                t.id === thread.id ? { ...t, title: thread.title } : t
              ),
            };
          }

          // Prepend new threads to the top of the list
          return {
            threads: [thread, ...state.threads],
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
