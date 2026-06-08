import type { Prisma } from '@prisma/client';

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
