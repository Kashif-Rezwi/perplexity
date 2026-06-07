import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AskService } from '../ask/ask.service';
import { AskRequestDto } from './dto/ask-request.dto';
import { SourcesQueryDto } from './dto/sources-query.dto';
import { ThreadParamsDto } from './dto/thread-params.dto';
import { SourcesService } from '../sources/sources.service';
import { ThreadsService } from '../threads/threads.service';

@Controller('perplexity')
export class PerplexityController {
  constructor(
    private readonly askService: AskService,
    private readonly sourcesService: SourcesService,
    private readonly threadsService: ThreadsService,
  ) {}

  @Post('ask')
  ask(@Body() body: AskRequestDto) {
    return this.askService.ask({
      question: body.question,
      threadId: body.threadId,
    });
  }

  @Get('sources')
  listSources(@Query() query: SourcesQueryDto) {
    return this.sourcesService.listSources({
      limit: query.limit,
      turnId: query.turnId,
    });
  }

  @Get('threads/:threadId')
  getThreadDetail(@Param() params: ThreadParamsDto) {
    return this.threadsService.getThreadDetail(params.threadId);
  }
}
