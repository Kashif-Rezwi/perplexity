import { Module } from '@nestjs/common';
import { ThreadsRepository } from './repositories/threads.repository';
import { ThreadsService } from './threads.service';

@Module({
  providers: [ThreadsRepository, ThreadsService],
  exports: [ThreadsService],
})
export class ThreadsModule {}
