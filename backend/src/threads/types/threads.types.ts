import { ThreadMode, ThreadStatus, TurnStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { CreateTurnSourceInput } from '../../sources/types/sources.types';

// ==========================================
// Command Types
// ==========================================
export type CreateThreadWithPendingTurnInput = {
  title: string;
  question: string;
  searchQuery: string;
};

export type AppendPendingTurnToThreadInput = {
  threadId: string;
  question: string;
  searchQuery: string;
};

export type CompleteTurnInput = {
  threadId: string;
  turnId: string;
  answerMarkdown: string;
  answerPreview: string;
  sources: CreateTurnSourceInput[];
  citationNumbers: number[];
  suggestedFollowUpQuestions: string[];
};

export type FailTurnInput = {
  threadId: string;
  turnId: string;
  errorMessage: string;
};

export type RenameThreadInput = {
  threadId: string;
  title: string;
};

export type TogglePinInput = {
  threadId: string;
  isPinned: boolean;
};

export type BulkDeleteThreadsResult = {
  requestedCount: number;
  deletedCount: number;
};

export type ThreadListSort = 'newest' | 'oldest';
export type ThreadListModeFilter = 'all' | 'web' | 'deep-research';

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
export const turnDetailInclude = {
  sources: { orderBy: { citationNumber: 'asc' as const } },
  citations: { orderBy: { citationNumber: 'asc' as const } },
} satisfies Prisma.TurnInclude;

export type TurnDetailRecord = Prisma.TurnGetPayload<{
  include: typeof turnDetailInclude;
}>;

export const threadDetailInclude = {
  _count: { select: { turns: true } },
  turns: {
    orderBy: { createdAt: 'asc' as const },
    include: turnDetailInclude,
  },
} satisfies Prisma.ThreadInclude;

export type ThreadDetailRecord = Prisma.ThreadGetPayload<{
  include: typeof threadDetailInclude;
}>;

export type ThreadWithSingleTurnRecord = {
  thread: Omit<ThreadDetailRecord, 'turns'>;
  turn: TurnDetailRecord;
  totalSourceCount: number;
};

export const threadListInclude = {
  _count: { select: { turns: true } },
} satisfies Prisma.ThreadInclude;

export type ThreadListBaseRecord = Prisma.ThreadGetPayload<{
  include: typeof threadListInclude;
}>;

export type ThreadListRecord = ThreadListBaseRecord & {
  totalSourceCount: number;
};

export type ThreadHeaderRecord = {
  id: string;
  title: string;
  answerPreview: string | null;
  status: ThreadStatus;
  mode: ThreadMode;
  isPinned: boolean;
  pinnedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { turns: number };
};

// ==========================================
// Response Types
// ==========================================
export type ApiThreadStatus = 'running' | 'completed' | 'failed';
export type ApiThreadMode = 'web';
export type ApiTurnStatus = 'pending' | 'completed' | 'failed';

export type ThreadSummaryItem = {
  threadId: string;
  title: string;
  status: ApiThreadStatus;
  mode: ApiThreadMode;
  answerPreview: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  totalSourceCount: number;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
};

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

export type CitationItem = {
  citationId: string;
  sourceId: string;
  citationNumber: number;
  createdAt: string;
};

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

export type ThreadDetailResponse = ThreadSummaryItem & {
  turns: TurnItem[];
};

export type ThreadListResponse = {
  items: ThreadSummaryItem[];
  nextCursor: string | null;
};

// Shared enum lookup tables to map Prisma types to API response types.
export const THREAD_STATUS_MAP: Record<ThreadStatus, ApiThreadStatus> = {
  [ThreadStatus.RUNNING]: 'running',
  [ThreadStatus.COMPLETED]: 'completed',
  [ThreadStatus.FAILED]: 'failed',
};

export const THREAD_MODE_MAP: Record<ThreadMode, ApiThreadMode> = {
  [ThreadMode.WEB]: 'web',
};

export const TURN_STATUS_MAP: Record<TurnStatus, ApiTurnStatus> = {
  [TurnStatus.PENDING]: 'pending',
  [TurnStatus.COMPLETED]: 'completed',
  [TurnStatus.FAILED]: 'failed',
};
