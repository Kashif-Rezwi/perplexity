import type { ThreadHistoryItem } from '@/store/historyStore';
import type { ThreadSummaryItem } from '@/types/api.types';

export function mapThreadSummaryToHistoryItem(
  thread: ThreadSummaryItem,
): ThreadHistoryItem {
  return {
    id: thread.threadId,
    title: thread.title,
    mode: thread.mode,
    updatedAt: thread.updatedAt,
  };
}
