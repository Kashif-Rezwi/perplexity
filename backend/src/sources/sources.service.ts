import { Injectable } from '@nestjs/common';
import { mapSource } from './mappers/source-response.mapper';
import { SourcesRepository } from './repositories/sources.repository';
import type {
  ListSourcesOptions,
  ListSourcesResponse,
} from './types/sources.types';

const DEFAULT_SOURCES_LIMIT = 20;

@Injectable()
export class SourcesService {
  constructor(private readonly sourcesRepository: SourcesRepository) {}

  async listSources(
    options: ListSourcesOptions = {},
  ): Promise<ListSourcesResponse> {
    const limit = options.limit ?? DEFAULT_SOURCES_LIMIT;
    const sources = await this.sourcesRepository.findSources({
      limit,
      turnId: options.turnId,
      cursor: options.cursor,
    });

    const hasNextPage = sources.length > limit;
    const items = hasNextPage ? sources.slice(0, limit) : sources;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return {
      items: items.map(mapSource),
      nextCursor,
    };
  }
}
