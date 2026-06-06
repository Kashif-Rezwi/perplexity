import type { TurnItem } from '../../threads/types/thread.types';
import type {
  AskCitationReference,
  AskTurnSummary,
} from '../types/ask.types';

export function mapAskTurnSummary(turn: TurnItem): AskTurnSummary {
  return {
    turnId: turn.turnId,
    question: turn.question,
    searchQuery: turn.searchQuery,
    answerMarkdown: turn.answerMarkdown,
    suggestedFollowUpQuestions: turn.suggestedFollowUpQuestions,
    status: turn.status,
    errorMessage: turn.errorMessage,
    sourceCount: turn.sources.length,
    citationCount: turn.citations.length,
    citations: mapAskCitationReferences(turn),
    createdAt: turn.createdAt,
    completedAt: turn.completedAt,
  };
}

function mapAskCitationReferences(turn: TurnItem): AskCitationReference[] {
  const sourcesById = new Map(
    turn.sources.map((source) => [source.sourceId, source]),
  );

  return turn.citations.flatMap((citation) => {
    const source = sourcesById.get(citation.sourceId);

    if (!source) {
      return [];
    }

    return {
      citationId: citation.citationId,
      citationNumber: citation.citationNumber,
      sourceId: source.sourceId,
      title: source.title,
      domain: source.domain,
      url: source.url,
      snippet: source.snippet,
      publishedAt: source.publishedAt,
    };
  });
}
