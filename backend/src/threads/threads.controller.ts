import { Controller, Get, Param, Delete, HttpCode } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { ThreadsService } from './threads.service';

export class ThreadParamsDto {
  @IsUUID()
  threadId!: string;
}

@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Get(':threadId')
  getThreadDetail(@Param() params: ThreadParamsDto) {
    return this.threadsService.getThreadDetail(params.threadId);
  }

  @Delete(':threadId')
  @HttpCode(204)
  deleteThread(@Param() params: ThreadParamsDto) {
    return this.threadsService.deleteThread(params.threadId);
  }
}
