import type { Prisma } from '@prisma/client';

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
