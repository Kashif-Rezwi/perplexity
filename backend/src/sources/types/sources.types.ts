import type { Prisma } from '@prisma/client';

export type CreateTurnSourceInput = {
  citationNumber: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  provider: string;
  providerScore: number | null;
  publishedAt: Date | null;
};

export const sourceInclude = {
  turn: {
    select: {
      id: true,
      question: true,
      thread: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  },
} satisfies Prisma.SourceInclude;

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

export type ListSourcesResponse = SourceItem[];
