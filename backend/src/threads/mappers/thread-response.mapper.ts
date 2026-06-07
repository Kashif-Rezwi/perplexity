import { ThreadMode, ThreadStatus, TurnStatus } from '@prisma/client';
import type {
  ThreadDetailRecord,
  TurnDetailRecord,
} from '../types/thread-record.types';
import type {
  ApiThreadMode,
  ApiThreadStatus,
  ApiTurnStatus,
  ThreadDetailResponse,
  ThreadHeaderRecord,
  ThreadSummaryItem,
  TurnItem,
} from '../types/thread-response.types';

export function mapThreadDetail(thread: ThreadDetailRecord): ThreadDetailResponse {
  const totalSourceCount = thread.turns.reduce((n, t) => n + t.sources.length, 0);
  return {
    ...mapHeader(thread, totalSourceCount),
    turns: thread.turns.map(mapTurnDetail),
  };
}

export function mapTurnDetail(turn: TurnDetailRecord): TurnItem {
  return {
    turnId: turn.id,
    question: turn.question,
    searchQuery: turn.searchQuery,
    answerMarkdown: turn.answerMarkdown,
    suggestedFollowUpQuestions: turn.suggestedFollowUpQuestions,
    status: TURN_STATUS[turn.status],
    errorMessage: turn.errorMessage,
    sources: turn.sources.map((s) => ({
      sourceId: s.id,
      citationNumber: s.citationNumber,
      title: s.title,
      url: s.url,
      domain: s.domain,
      snippet: s.snippet,
      provider: s.provider,
      providerScore: s.providerScore,
      publishedAt: s.publishedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
    citations: turn.citations.map((c) => ({
      citationId: c.id,
      sourceId: c.sourceId,
      citationNumber: c.citationNumber,
      createdAt: c.createdAt.toISOString(),
    })),
    createdAt: turn.createdAt.toISOString(),
    completedAt: turn.completedAt?.toISOString() ?? null,
  };
}

export function mapHeader(thread: ThreadHeaderRecord, totalSourceCount: number): ThreadSummaryItem {
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
