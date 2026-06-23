import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getSources } from '@/lib/api';
import type {
  SourceHighlightTarget,
  SourcesResponse,
  TurnItem,
  TurnSourceGroup,
} from '@/types/api.types';

// Fetches canonical per-turn source lists while using thread-detail sources as the instant fallback.
export function useThreadSources(
  threadId: string,
  turns: TurnItem[],
  shouldFetchSources = true,
  highlightedSourceTarget?: SourceHighlightTarget | null,
): TurnSourceGroup[] {
  const completedTurns = useMemo(
    () => turns.filter((turn) => turn.status === 'completed'),
    [turns],
  );

  const sourceQueries = useQueries({
    queries: completedTurns.map((turn) => ({
      queryKey: ['sources', threadId, turn.turnId],
      queryFn: () => getSources({ turnId: turn.turnId }),
      enabled:
        Boolean(threadId) &&
        (shouldFetchSources || highlightedSourceTarget?.turnId === turn.turnId),
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
        citedCitationNumbers: turn.citations.map(
          (citation) => citation.citationNumber,
        ),
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
