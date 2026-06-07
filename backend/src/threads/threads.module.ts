import { Module } from '@nestjs/common';
import { ThreadsRepository } from './repositories/threads.repository';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';

@Module({
  controllers: [ThreadsController],
  providers: [ThreadsRepository, ThreadsService],
  exports: [ThreadsService],
})
export class ThreadsModule {}
