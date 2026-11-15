import type {
  ThreadWithSingleTurnRecord,
  TurnDetailRecord,
} from '../../threads/types/threads.types';
import { TURN_STATUS_MAP } from '../../threads/types/threads.types';
import { mapHeader } from '../../threads/mappers/thread-response.mapper';
import type {
  AskCitationReference,
  AskResponse,
  AskTurnSummary,
} from '../types/ask.types';

export function mapAskResponse(record: ThreadWithSingleTurnRecord): AskResponse {
  return {
    thread: mapHeader(record.thread, record.totalSourceCount),
    turn: mapAskTurnSummary(record.turn),
  };
}

export function mapAskTurnSummary(turn: TurnDetailRecord): AskTurnSummary {
  const citations = mapAskCitationReferences(turn);

  return {
    turnId: turn.id,
    question: turn.question,
    searchQuery: turn.searchQuery,
    answerMarkdown: turn.answerMarkdown,
    suggestedFollowUpQuestions: turn.suggestedFollowUpQuestions,
    status: TURN_STATUS_MAP[turn.status],
    errorMessage: turn.errorMessage,
    sourceCount: turn.sources.length,
    citationCount: citations.length,
    citations,
    createdAt: turn.createdAt.toISOString(),
    completedAt: turn.completedAt?.toISOString() ?? null,
  };
}

function mapAskCitationReferences(turn: TurnDetailRecord): AskCitationReference[] {
  const sourcesById = new Map(
    turn.sources.map((source) => [source.id, source]),
  );

  return turn.citations.flatMap((citation) => {
    const source = sourcesById.get(citation.sourceId);

    if (!source) {
      return [];
    }

    return {
      citationId: citation.id,
      citationNumber: citation.citationNumber,
      sourceId: source.id,
      title: source.title,
      domain: source.domain,
      url: source.url,
      snippet: source.snippet,
      publishedAt: source.publishedAt?.toISOString() ?? null,
    };
  });
}
