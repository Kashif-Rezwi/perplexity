import { Controller, Get, Param } from '@nestjs/common';
import { ThreadParamsDto } from './dto/thread-params.dto';
import { ThreadsService } from './threads.service';

@Controller('perplexity')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Get('threads/:threadId')
  getThreadDetail(@Param() params: ThreadParamsDto) {
    return this.threadsService.getThreadDetail(params.threadId);
  }
}
