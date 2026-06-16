import type {
  AskTurnSummary,
  CitationItem,
  SourceItem,
  TurnItem,
} from '@/types/api.types';

/** Client-side TurnItem extension with cached citation sources for immediate rendering. */
export type TurnItemWithCache = TurnItem & {
  citationSources: SourceItem[];
};

/** Maps an ask turn into the thread detail turn shape. */
export function mapAskTurnToTurnItem(turn: AskTurnSummary): TurnItemWithCache {
  const citationRefs = turn.citations ?? [];

  // Deduplicate citation sources by ID.
  const seenSourceIds = new Set<string>();
  const citationSources: SourceItem[] = citationRefs.reduce<SourceItem[]>((acc, citation) => {
    if (!seenSourceIds.has(citation.sourceId)) {
      seenSourceIds.add(citation.sourceId);
      acc.push({
        sourceId: citation.sourceId,
        citationNumber: citation.citationNumber,
        title: citation.title,
        url: citation.url,
        domain: citation.domain,
        snippet: citation.snippet,
        publishedAt: citation.publishedAt,
        createdAt: turn.createdAt,
        // Provider metadata is loaded via GET /sources.
        provider: 'unknown',
        providerScore: null,
      });
    }
    return acc;
  }, []);

  // Retain all citations for inline text linking.
  const citations: CitationItem[] = citationRefs.map((citation) => ({
    citationId: citation.citationId,
    sourceId: citation.sourceId,
    citationNumber: citation.citationNumber,
    createdAt: turn.createdAt,
  }));

  return {
    turnId: turn.turnId,
    question: turn.question,
    searchQuery: turn.searchQuery,
    answerMarkdown: turn.answerMarkdown,
    suggestedFollowUpQuestions: turn.suggestedFollowUpQuestions ?? [],
    status: turn.status,
    errorMessage: turn.errorMessage,
    sourceCount: turn.sourceCount,
    citationCount: turn.citationCount,
    // sources is empty until refetched; citationSources holds previews.
    sources: [],
    citationSources,
    citations,
    createdAt: turn.createdAt,
    completedAt: turn.completedAt,
  };
}
