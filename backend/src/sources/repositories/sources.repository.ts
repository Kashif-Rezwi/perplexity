import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  sourceInclude,
  type ListSourcesOptions,
  type SourceRecord,
} from '../types/sources.types';

@Injectable()
export class SourcesRepository {
  constructor(private readonly database: DatabaseService) { }

  findSources(
    options: Required<Pick<ListSourcesOptions, 'limit'>> & ListSourcesOptions,
  ): Promise<SourceRecord[]> {
    return this.database.source.findMany({
      take: options.limit + 1, // Take one extra to determine if there's a next page
      skip: options.cursor ? 1 : undefined,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      where: options.turnId ? { turnId: options.turnId } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: sourceInclude,
    });
  }
}
