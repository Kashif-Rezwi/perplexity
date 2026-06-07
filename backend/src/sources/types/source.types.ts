import type { Prisma } from '@prisma/client';
import { sourceInclude } from '../repositories/sources.repository';

export type SourceRecord = Prisma.SourceGetPayload<{
  include: typeof sourceInclude;
}>;

export type ListSourcesOptions = {
  limit?: number;
  turnId?: string;
};

export type SourceItem = {
  sourceId: string;
  turnId: string;
  threadId: string;
  threadTitle: string;
  question: string;
  citationNumber: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  publishedAt: string | null;
  createdAt: string;
};

export type ListSourcesResponse = {
  items: SourceItem[];
  nextCursor: null;
};
