import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { BulkDeleteThreadsDto } from './dto/bulk-delete-threads.dto';
import { RenameThreadDto } from './dto/rename-thread.dto';
import { ThreadListQueryDto } from './dto/thread-list-query.dto';
import { ThreadsService } from './threads.service';

export class ThreadParamsDto {
  @IsUUID()
  threadId!: string;
}

@Controller('threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Get()
  listThreads(@Query() query: ThreadListQueryDto) {
    return this.threadsService.listThreads(query);
  }

  @Delete()
  deleteThreads(@Body() body: BulkDeleteThreadsDto) {
    return this.threadsService.deleteThreads(body.threadIds);
  }

  @Get(':threadId')
  getThreadDetail(@Param() params: ThreadParamsDto) {
    return this.threadsService.getThreadDetail(params.threadId);
  }

  @Patch(':threadId')
  renameThread(
    @Param() params: ThreadParamsDto,
    @Body() body: RenameThreadDto,
  ) {
    return this.threadsService.renameThread({
      threadId: params.threadId,
      title: body.title,
    });
  }

  @Delete(':threadId')
  @HttpCode(204)
  deleteThread(@Param() params: ThreadParamsDto) {
    return this.threadsService.deleteThread(params.threadId);
  }
}
