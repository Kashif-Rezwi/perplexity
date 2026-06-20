import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { sourceInclude, type SourceRecord } from '../types/sources.types';

type FindSourcesOptions = {
  limit: number;
  turnId?: string;
  cursor?: string;
};

@Injectable()
export class SourcesRepository {
  constructor(private readonly database: DatabaseService) { }

  findSources(
    options: FindSourcesOptions,
  ): Promise<SourceRecord[]> {
    return this.database.source.findMany({
      take: options.limit + 1, // Take one extra to determine if there's a next page
      skip: options.cursor ? 1 : undefined,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      where: options.turnId ? { turnId: options.turnId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: sourceInclude,
    });
  }
}
