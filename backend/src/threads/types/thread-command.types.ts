import type { CreateTurnSourceInput } from '../../sources/types/source-persistence.types';

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
