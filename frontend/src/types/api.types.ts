export type ApiThreadStatus = 'running' | 'completed' | 'failed';
export type ApiThreadMode = 'web';
export type ApiTurnStatus = 'pending' | 'completed' | 'failed';

export type ThreadSummaryItem = {
  threadId: string;
  title: string;
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

export type SourcePreviewItem = {
  sourceId: string;
  citationNumber: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  publishedAt: string | null;
  createdAt: string;
};

export type SourceItem = SourcePreviewItem & {
  provider: string;
  providerScore: number | null;
};

// Source item with parent turn/thread context returned by GET /sources.
export type SourceListItem = SourcePreviewItem & {
  turnId: string;
  threadId: string;
  threadTitle: string;
  question: string;
};

// Response list returned by GET /sources.
export type SourcesResponse = {
  items: SourceListItem[];
  nextCursor: string | null;
};

// A single turn's sources assembled for the thread-level Links tab.
export type TurnSourceGroup = {
  turnId: string;
  question: string;
  searchQuery: string;
  sources: SourcePreviewItem[];
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
