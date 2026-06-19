import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getSources } from '@/lib/api';
import type {
  SourcesResponse,
  TurnItem,
  TurnSourceGroup,
} from '@/types/api.types';

// Fetches canonical per-turn source lists while using thread-detail sources as the instant fallback.
export function useThreadSources(
  threadId: string,
  turns: TurnItem[],
): TurnSourceGroup[] {
  const completedTurns = useMemo(
    () => turns.filter((turn) => turn.status === 'completed'),
    [turns],
  );

  const sourceQueries = useQueries({
    queries: completedTurns.map((turn) => ({
      queryKey: ['sources', threadId, turn.turnId],
      queryFn: () => getSources({ turnId: turn.turnId }),
      enabled: Boolean(threadId),
      placeholderData: createFallbackSourcesResponse(threadId, turn),
      staleTime: 60_000,
    })),
  });

  return useMemo(() => {
    return completedTurns
      .map((turn, index) => ({
        turnId: turn.turnId,
        question: turn.question,
        searchQuery: turn.searchQuery,
        sources: sourceQueries[index]?.data?.items ?? turn.sources,
      }))
      .reverse();
  }, [completedTurns, sourceQueries]);
}

function createFallbackSourcesResponse(
  threadId: string,
  turn: TurnItem,
): SourcesResponse {
  return {
    items: turn.sources.map((source) => ({
      sourceId: source.sourceId,
      turnId: turn.turnId,
      threadId,
      threadTitle: '',
      question: turn.question,
      citationNumber: source.citationNumber,
      title: source.title,
      url: source.url,
      domain: source.domain,
      snippet: source.snippet,
      publishedAt: source.publishedAt,
      createdAt: source.createdAt,
    })),
    nextCursor: null,
  };
}
