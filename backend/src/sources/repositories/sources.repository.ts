import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RecentSourceRecord } from '../types/source.types';

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

  findRecentSources(limit: number): Promise<RecentSourceRecord[]> {
    return this.prisma.source.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: recentSourceInclude,
    });
  }
}
