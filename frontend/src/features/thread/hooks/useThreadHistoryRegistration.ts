import { useEffect } from 'react';
import { useHistoryStore } from '@/store/historyStore';
import type { ThreadDetailResponse } from '@/types/api.types';

export function useThreadHistoryRegistration(thread?: ThreadDetailResponse) {
  const addThread = useHistoryStore((state) => state.addThread);

  useEffect(() => {
    if (!thread) return;

    addThread({
      id: thread.threadId,
      title: thread.title,
      mode: thread.mode,
      updatedAt: thread.updatedAt,
    });
  }, [thread, addThread]);
}
