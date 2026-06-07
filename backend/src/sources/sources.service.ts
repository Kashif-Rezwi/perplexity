import { Injectable } from '@nestjs/common';
import { mapSource } from './mappers/source-response.mapper';
import { SourcesRepository } from './repositories/sources.repository';
import type {
  ListSourcesOptions,
  ListSourcesResponse,
} from './types/source.types';

@Injectable()
export class SourcesService {
  constructor(private readonly sourcesRepository: SourcesRepository) {}

  async listSources(
    options: ListSourcesOptions = {},
  ): Promise<ListSourcesResponse> {
    const limit = options.limit ?? 20;
    const sources = await this.sourcesRepository.findSources({
      limit,
      turnId: options.turnId,
    });

    return {
      items: sources.map(mapSource),
      nextCursor: null,
    };
  }
}
