import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
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
  constructor(private readonly database: DatabaseService) {}

  findSources(
    options: FindSourcesOptions,
  ): Promise<SourceRecord[]> {
    return this.database.source.findMany({
      take: options.limit,
      where: options.turnId ? { turnId: options.turnId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: sourceInclude,
    });
  }
}
