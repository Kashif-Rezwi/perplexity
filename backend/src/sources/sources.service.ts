import { Injectable } from '@nestjs/common';
import { mapRecentSource } from './mappers/source-response.mapper';
import { SourcesRepository } from './repositories/sources.repository';
import type {
  ListRecentSourcesOptions,
  ListRecentSourcesResponse,
} from './types/source.types';

@Injectable()
export class SourcesService {
  constructor(private readonly sourcesRepository: SourcesRepository) {}

  async listRecentSources(
    options: ListRecentSourcesOptions = {},
  ): Promise<ListRecentSourcesResponse> {
    const limit = options.limit ?? 20;
    const sources = await this.sourcesRepository.findRecentSources(limit);

    return {
      items: sources.map(mapRecentSource),
      nextCursor: null,
    };
  }
}
