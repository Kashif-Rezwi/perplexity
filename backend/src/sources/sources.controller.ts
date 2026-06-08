import { Controller, Get, Query } from '@nestjs/common';
import { SourcesQueryDto } from './dto/sources-query.dto';
import { SourcesService } from './sources.service';

@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  listSources(@Query() query: SourcesQueryDto) {
    return this.sourcesService.listSources({
      limit: query.limit,
      turnId: query.turnId,
    });
  }
}
