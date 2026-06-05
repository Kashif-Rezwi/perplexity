import type { Prisma } from '@prisma/client';
import { recentSourceInclude } from '../repositories/sources.repository';

export type RecentSourceRecord = Prisma.SourceGetPayload<{
  include: typeof recentSourceInclude;
}>;

export type ListRecentSourcesOptions = {
  limit?: number;
};

export type RecentSourceItem = {
  sourceId: string;
  turnId: string;
  threadId: string;
  threadTitle: string;
  question: string;
  link: string;
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

export type ListRecentSourcesResponse = {
  items: RecentSourceItem[];
  nextCursor: null;
};
