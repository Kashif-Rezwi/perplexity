import { useState } from 'react';

export function useHistorySelection() {
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleThreadSelection = (threadId: string) => {
    setSelectedThreadIds((current) => {
      const next = new Set(current);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedThreadIds(new Set());
  };

  return {
    selectedThreadIds,
    hasSelection: selectedThreadIds.size > 0,
    toggleThreadSelection,
    clearSelection,
  };
}

