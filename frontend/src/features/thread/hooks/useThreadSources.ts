import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TurnItem, SourcesResponse, TurnSourceGroup } from '@/types/api.types';

// Reads per-turn sources from the TanStack Query cache (newest first). Falls back to inline turn.sources on cache miss.
export function useThreadSources(
  threadId: string,
  turns: TurnItem[],
): TurnSourceGroup[] {
  const queryClient = useQueryClient();

  return useMemo(() => {
    const groups: TurnSourceGroup[] = [];

    for (const turn of turns) {
      if (turn.status !== 'completed') continue;

      // Prefer cached sources (prefetched by useAskSubmit); fall back to inline.
      const cached = queryClient.getQueryData<SourcesResponse>([
        'sources',
        threadId,
        turn.turnId,
      ]);

      const sources = cached?.items ?? turn.sources;

      groups.push({
        turnId: turn.turnId,
        question: turn.question,
        searchQuery: turn.searchQuery,
        sources,
      });
    }

    return [...groups].reverse(); // spread to avoid in-place mutation
  }, [threadId, turns, queryClient]);
}
