export type ApiThreadStatus = 'running' | 'completed' | 'failed';
export type ApiThreadMode = 'web';
export type ApiTurnStatus = 'pending' | 'completed' | 'failed';

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
  suggestedFollowUpQuestions: string[];
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
