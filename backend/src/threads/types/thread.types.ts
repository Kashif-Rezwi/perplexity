import type { Prisma, ThreadMode, ThreadStatus } from '@prisma/client';
import type { CreateTurnSourceInput } from '../../sources/types/source-persistence.types';

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

export type ApiThreadStatus = 'running' | 'completed' | 'failed';
export type ApiThreadMode = 'web';
export type ApiTurnStatus = 'pending' | 'completed' | 'failed';

export type ThreadHeaderRecord = {
  id: string;
  title: string;
  answerPreview: string | null;
  status: ThreadStatus;
  mode: ThreadMode;
  createdAt: Date;
  updatedAt: Date;
  _count: { turns: number };
};

export type ThreadSummaryItem = {
  threadId: string;
  title: string;
  link: string;
  status: ApiThreadStatus;
  mode: ApiThreadMode;
  answerPreview: string | null;
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
  sources: SourceItem[];
  citations: CitationItem[];
  createdAt: string;
  completedAt: string | null;
};

export type ThreadDetailResponse = ThreadSummaryItem & {
  turns: TurnItem[];
};
