import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { SourceRecord } from '../types/source.types';

type FindSourcesOptions = {
  limit: number;
  turnId?: string;
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

@Injectable()
export class SourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSources(
    options: FindSourcesOptions,
  ): Promise<SourceRecord[]> {
    return this.prisma.source.findMany({
      take: options.limit,
      where: options.turnId ? { turnId: options.turnId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: sourceInclude,
    });
  }
}
