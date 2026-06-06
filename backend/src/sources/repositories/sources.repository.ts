import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RecentSourceRecord } from '../types/source.types';

type FindRecentSourcesOptions = {
  limit: number;
  turnId?: string;
};

export const recentSourceInclude = {
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

@Injectable()
export class SourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRecentSources(
    options: FindRecentSourcesOptions,
  ): Promise<RecentSourceRecord[]> {
    return this.prisma.source.findMany({
      take: options.limit,
      where: options.turnId ? { turnId: options.turnId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: recentSourceInclude,
    });
  }
}
