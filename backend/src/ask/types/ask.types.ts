import type {
  ApiTurnStatus,
  ThreadSummaryItem,
} from '../../threads/types/thread.types';

export type AskInput = {
  question: string;
  threadId?: string;
};

export type AskCitationReference = {
  citationId: string;
  citationNumber: number;
  sourceId: string;
  title: string;
  domain: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
};

export type AskTurnSummary = {
  turnId: string;
  question: string;
  searchQuery: string;
  answerMarkdown: string | null;
  status: ApiTurnStatus;
  errorMessage: string | null;
  sourceCount: number;
  citationCount: number;
  citations: AskCitationReference[];
  createdAt: string;
  completedAt: string | null;
};

export type AskResponse = {
  thread: ThreadSummaryItem;
  turn: AskTurnSummary;
};
