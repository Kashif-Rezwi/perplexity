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
    const sources = await this.sourcesRepository.findSources({
      limit: query.limit ?? DEFAULT_SOURCES_LIMIT,
      turnId: query.turnId,
    });

    return sources.map(mapSource);
  }
}
