import type { AskTurnSummary, CitationItem, SourceItem, TurnItem } from '@/types/api.types';

/** Maps an ask response turn into the thread detail turn shape for optimistic cache updates. */
export function mapAskTurnToTurnItem(turn: AskTurnSummary): TurnItem {
  const citationRefs = turn.citations ?? [];

  const sources: SourceItem[] = citationRefs.map((citation) => ({
    sourceId: citation.sourceId,
    citationNumber: citation.citationNumber,
    title: citation.title,
    url: citation.url,
    domain: citation.domain,
    snippet: citation.snippet,
    provider: 'tavily',
    providerScore: null,
    publishedAt: citation.publishedAt,
    createdAt: turn.createdAt,
  }));

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
    sources,
    citations,
    createdAt: turn.createdAt,
    completedAt: turn.completedAt,
  };
}
