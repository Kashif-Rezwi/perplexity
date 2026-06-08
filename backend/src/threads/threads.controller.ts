import { Controller, Get, Param } from '@nestjs/common';
import { ThreadParamsDto } from './dto/thread-params.dto';
import { ThreadsService } from './threads.service';

@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Get(':threadId')
  getThreadDetail(@Param() params: ThreadParamsDto) {
    return this.threadsService.getThreadDetail(params.threadId);
  }
}
