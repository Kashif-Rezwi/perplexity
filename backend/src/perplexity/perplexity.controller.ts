import { Controller, Get, Param, Query } from '@nestjs/common';
import { RecentSourcesQueryDto } from './dto/recent-sources-query.dto';
import { ThreadParamsDto } from './dto/thread-params.dto';
import { SourcesService } from '../sources/sources.service';
import { ThreadsService } from '../threads/threads.service';

@Controller('perplexity')
export class PerplexityController {
  constructor(
    private readonly sourcesService: SourcesService,
    private readonly threadsService: ThreadsService,
  ) {}

  @Get('recents')
  listRecentSources(@Query() query: RecentSourcesQueryDto) {
    return this.sourcesService.listRecentSources({ limit: query.limit });
  }

  @Get('threads/:threadId')
  getThreadDetail(@Param() params: ThreadParamsDto) {
    return this.threadsService.getThreadDetail(params.threadId);
  }
}
