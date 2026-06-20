import { Controller, Get, Query } from '@nestjs/common';
import { SourcesQueryDto } from './dto/sources-query.dto';
import { SourcesRepository } from './repositories/sources.repository';
import { mapSource } from './mappers/source-response.mapper';

const DEFAULT_SOURCES_LIMIT = 20;

@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesRepository: SourcesRepository) {}

  @Get()
  async listSources(@Query() query: SourcesQueryDto) {
    const limit = query.limit ?? DEFAULT_SOURCES_LIMIT;
    const sources = await this.sourcesRepository.findSources({
      limit,
      turnId: query.turnId,
      cursor: query.cursor,
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
