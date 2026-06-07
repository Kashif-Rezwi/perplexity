import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { sourceInclude, type SourceRecord } from './source-record.types';

type FindSourcesOptions = {
  limit: number;
  turnId?: string;
};

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
