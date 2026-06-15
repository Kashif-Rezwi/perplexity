import type { ThreadHistoryItem } from '@/store/historyStore';

export function getThreadTime(thread: ThreadHistoryItem) {
  const value = thread.updatedAt ? Date.parse(thread.updatedAt) : Number.NaN;
  return Number.isFinite(value) ? value : 0;
}

export function formatRelativeDate(thread: ThreadHistoryItem) {
  const timestamp = getThreadTime(thread);

  if (!timestamp) {
    return 'recently';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export function getThreadMode(thread: ThreadHistoryItem): 'web' | 'deep-research' {
  return thread.mode === 'deep-research' ? 'deep-research' : 'web';
}

