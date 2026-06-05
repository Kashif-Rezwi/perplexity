import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const detailInclude = {
  _count: { select: { turns: true } },
  turns: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      sources: { orderBy: { citationNumber: 'asc' as const } },
      citations: { orderBy: { citationNumber: 'asc' as const } },
    },
  },
} satisfies Prisma.ThreadInclude;

export type ThreadDetailRecord = Prisma.ThreadGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class ThreadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findThreadDetailById(threadId: string): Promise<ThreadDetailRecord | null> {
    return this.prisma.thread.findUnique({
      where: { id: threadId },
      include: detailInclude,
    });
  }
}
