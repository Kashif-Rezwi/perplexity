import { ThreadMode, ThreadStatus, TurnStatus } from '@prisma/client';
import type {
  ThreadWithSingleTurnRecord,
  TurnDetailRecord,
} from '../../threads/types/thread-record.types';
import type {
  ApiThreadMode,
  ApiThreadStatus,
  ApiTurnStatus,
  ThreadSummaryItem,
} from '../../threads/types/thread-response.types';
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
    status: TURN_STATUS[turn.status],
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
    link: `/search/${thread.id}`,
    status: THREAD_STATUS[thread.status],
    mode: THREAD_MODE[thread.mode],
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

const THREAD_STATUS: Record<ThreadStatus, ApiThreadStatus> = {
  [ThreadStatus.RUNNING]: 'running',
  [ThreadStatus.COMPLETED]: 'completed',
  [ThreadStatus.FAILED]: 'failed',
};

const THREAD_MODE: Record<ThreadMode, ApiThreadMode> = {
  [ThreadMode.WEB]: 'web',
};

const TURN_STATUS: Record<TurnStatus, ApiTurnStatus> = {
  [TurnStatus.PENDING]: 'pending',
  [TurnStatus.COMPLETED]: 'completed',
  [TurnStatus.FAILED]: 'failed',
};
