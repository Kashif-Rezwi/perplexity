import type {
  ThreadWithSingleTurnRecord,
  TurnDetailRecord,
} from '../../threads/types/threads.types';
import type {
  ThreadSummaryItem,
} from '../../threads/types/threads.types';
import {
  THREAD_MODE_MAP,
  THREAD_STATUS_MAP,
  TURN_STATUS_MAP,
} from '../../threads/types/threads.types';
import type {
  AskCitationReference,
  AskResponse,
  AskTurnSummary,
} from '../types/ask.types';

export function mapAskResponse(record: ThreadWithSingleTurnRecord): AskResponse {
  return {
    thread: mapAskThreadSummary(record.thread, record.totalSourceCount),
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

function mapAskThreadSummary(
  thread: ThreadWithSingleTurnRecord['thread'],
  totalSourceCount: number,
): ThreadSummaryItem {
  return {
    threadId: thread.id,
    title: thread.title,
    status: THREAD_STATUS_MAP[thread.status],
    mode: THREAD_MODE_MAP[thread.mode],
    answerPreview: thread.answerPreview,
    totalSourceCount,
    turnCount: thread._count.turns,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
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
