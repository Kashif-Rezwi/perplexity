import type {
  AskTurnSummary,
  CitationItem,
  SourcePreviewItem,
  TurnItem,
} from '@/types/api.types';

/** Maps an ask response turn into the thread detail turn shape for optimistic cache updates. */
export function mapAskTurnToTurnItem(turn: AskTurnSummary): TurnItem {
  const citationRefs = turn.citations ?? [];

  // Deduplicate by sourceId — ask returns lightweight cited-source previews, not
  // the full turn source list. Full sources are loaded separately via /sources.
  const seenSourceIds = new Set<string>();
  const citationSources: SourcePreviewItem[] = citationRefs.reduce<SourcePreviewItem[]>((acc, citation) => {
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
      });
    }
    return acc;
  }, []);

  // Citations stay non-deduplicated — each is a distinct inline link in the text.
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
    sources: [],
    citationSources,
    citations,
    createdAt: turn.createdAt,
    completedAt: turn.completedAt,
  };
}
