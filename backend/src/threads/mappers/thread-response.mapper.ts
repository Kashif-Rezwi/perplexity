import type {
  ThreadDetailRecord,
  TurnDetailRecord,
} from '../types/threads.types';
import type {
  ThreadDetailResponse,
  ThreadHeaderRecord,
  ThreadListRecord,
  ThreadSummaryItem,
  TurnItem,
} from '../types/threads.types';
import {
  THREAD_MODE_MAP,
  THREAD_STATUS_MAP,
  TURN_STATUS_MAP,
} from '../types/threads.types';

export function mapThreadDetail(thread: ThreadDetailRecord): ThreadDetailResponse {
  const totalSourceCount = thread.turns.reduce((n, t) => n + t.sources.length, 0);
  return {
    ...mapHeader(thread, totalSourceCount),
    turns: thread.turns.map(mapTurnDetail),
  };
}

export function mapThreadSummary(thread: ThreadListRecord): ThreadSummaryItem {
  return mapHeader(thread, thread.totalSourceCount);
}

export function mapTurnDetail(turn: TurnDetailRecord): TurnItem {
  return {
    turnId: turn.id,
    question: turn.question,
    searchQuery: turn.searchQuery,
    answerMarkdown: turn.answerMarkdown,
    suggestedFollowUpQuestions: turn.suggestedFollowUpQuestions,
    status: TURN_STATUS_MAP[turn.status],
    errorMessage: turn.errorMessage,
    sourceCount: turn.sources.length,
    citationCount: turn.citations.length,
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
    status: THREAD_STATUS_MAP[thread.status],
    mode: THREAD_MODE_MAP[thread.mode],
    answerPreview: thread.answerPreview,
    isPinned: thread.isPinned,
    pinnedAt: thread.pinnedAt?.toISOString() ?? null,
    totalSourceCount,
    turnCount: thread._count.turns,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  };
}
