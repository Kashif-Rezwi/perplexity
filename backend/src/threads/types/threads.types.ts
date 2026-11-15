import { ThreadMode, TurnStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { CreateTurnSourceInput } from '../../sources/types/sources.types';

// ==========================================
// Command Types
// ==========================================
// Values passed to thread service and repository methods.

// Values used to create a thread and its first pending question.
export type CreateThreadWithPendingTurnInput = {
  title: string;
  question: string;
  searchQuery: string;
};

// Existing thread ID and question data for adding a new pending turn.
export type AppendPendingTurnToThreadInput = {
  threadId: string;
  question: string;
  searchQuery: string;
};

// Answer, sources, cited numbers, and suggestions saved when a turn succeeds.
export type CompleteTurnInput = {
  threadId: string;
  turnId: string;
  answerMarkdown: string;
  sources: CreateTurnSourceInput[];
  citationNumbers: number[];
  suggestedFollowUpQuestions: string[];
};

// Thread and turn IDs plus the error to save when an attempt fails.
export type FailTurnInput = {
  threadId: string;
  turnId: string;
  errorMessage: string;
};

// Thread ID and replacement title for a rename.
export type RenameThreadInput = {
  threadId: string;
  title: string;
};

// Thread ID and desired pin state: true to pin, false to unpin.
export type TogglePinInput = {
  threadId: string;
  isPinned: boolean;
};

// Number of unique thread IDs requested and number of rows actually deleted.
export type BulkDeleteThreadsResult = {
  requestedCount: number;
  deletedCount: number;
};

// Order the thread list by most recent or oldest activity.
export type ThreadListSort = 'newest' | 'oldest';

// Thread-list filters; deep-research currently returns an empty list.
export type ThreadListModeFilter = 'all' | 'web' | 'deep-research';

// Optional page size, cursor, order, mode, title search, and pin filter.
export type ListThreadsOptions = {
  limit?: number;
  cursor?: string;
  sort?: ThreadListSort;
  mode?: ThreadListModeFilter;
  q?: string;
  excludePinned?: boolean;
};

// ==========================================
// Record Types
// ==========================================
// Database query results before they are formatted for the API.

// Load a turn's sources and citations, each sorted by citation number.
export const turnDetailInclude = {
  sources: { orderBy: { citationNumber: 'asc' as const } },
  citations: { orderBy: { citationNumber: 'asc' as const } },
} satisfies Prisma.TurnInclude;

// Prisma result type for a turn loaded with turnDetailInclude.
export type TurnDetailRecord = Prisma.TurnGetPayload<{
  include: typeof turnDetailInclude;
}>;

// Load turns oldest first; ID breaks timestamp ties so the latest turn is last.
export const threadDetailInclude = {
  _count: { select: { turns: true } },
  turns: {
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
    include: turnDetailInclude,
  },
} satisfies Prisma.ThreadInclude;

// Prisma result type for a thread loaded with threadDetailInclude.
export type ThreadDetailRecord = Prisma.ThreadGetPayload<{
  include: typeof threadDetailInclude;
}>;

// Thread header/latest status and one selected turn, plus the total source count.
export type ThreadWithSingleTurnRecord = {
  thread: ThreadListBaseRecord;
  turn: TurnDetailRecord;
  totalSourceCount: number;
};

// Load the turn count and only the latest turn's status for thread summaries.
export const threadListInclude = {
  _count: { select: { turns: true } },
  turns: {
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: 1,
    select: { status: true },
  },
} satisfies Prisma.ThreadInclude;

// Prisma result type for a thread loaded with threadListInclude.
export type ThreadListBaseRecord = Prisma.ThreadGetPayload<{
  include: typeof threadListInclude;
}>;

// A thread list record plus the source count across all its turns.
export type ThreadListRecord = ThreadListBaseRecord & {
  totalSourceCount: number;
};

// Thread fields, turn count, and latest status used by the shared response mapper.
export type ThreadHeaderRecord = ThreadListBaseRecord;

// ==========================================
// Response Types
// ==========================================
// Data returned by thread APIs after mapping database records.

// Thread API status is derived from the latest turn; it is not stored on Thread.
export type ApiThreadStatus = 'running' | 'completed' | 'failed';

// Thread modes returned by the API; only web is implemented.
export type ApiThreadMode = 'web';

// Lowercase turn status values exposed by the API.
export type ApiTurnStatus = 'pending' | 'completed' | 'failed';

// Thread details and counts returned in history and other thread responses.
export type ThreadSummaryItem = {
  threadId: string;
  title: string;
  status: ApiThreadStatus;
  mode: ApiThreadMode;
  isPinned: boolean;
  pinnedAt: string | null;
  totalSourceCount: number;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
};

// Saved source fields included in a turn returned by the API.
export type SourceItem = {
  sourceId: string;
  citationNumber: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  provider: string;
  providerScore: number | null;
  publishedAt: string | null;
  createdAt: string;
};

// Source ID and citation number returned for one saved answer reference.
export type CitationItem = {
  citationId: string;
  sourceId: string;
  citationNumber: number;
  createdAt: string;
};

// One question/answer attempt returned with its sources, citations, and status.
export type TurnItem = {
  turnId: string;
  question: string;
  searchQuery: string;
  answerMarkdown: string | null;
  suggestedFollowUpQuestions: string[];
  status: ApiTurnStatus;
  errorMessage: string | null;
  sourceCount: number;
  citationCount: number;
  sources: SourceItem[];
  citations: CitationItem[];
  createdAt: string;
  completedAt: string | null;
};

// A thread summary plus all of that thread's turns.
export type ThreadDetailResponse = ThreadSummaryItem & {
  turns: TurnItem[];
};

// One page of thread summaries; nextCursor is null when there is no next page.
export type ThreadListResponse = {
  items: ThreadSummaryItem[];
  nextCursor: string | null;
};

// Keep the thread API's running/completed/failed values using the latest turn.
export const THREAD_STATUS_FROM_TURN: Record<TurnStatus, ApiThreadStatus> = {
  [TurnStatus.PENDING]: 'running',
  [TurnStatus.COMPLETED]: 'completed',
  [TurnStatus.FAILED]: 'failed',
};

// Converts Prisma thread modes into API mode values.
export const THREAD_MODE_MAP: Record<ThreadMode, ApiThreadMode> = {
  [ThreadMode.WEB]: 'web',
};

// Converts Prisma turn statuses into lowercase API statuses.
export const TURN_STATUS_MAP: Record<TurnStatus, ApiTurnStatus> = {
  [TurnStatus.PENDING]: 'pending',
  [TurnStatus.COMPLETED]: 'completed',
  [TurnStatus.FAILED]: 'failed',
};
