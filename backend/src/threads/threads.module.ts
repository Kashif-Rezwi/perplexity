import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ThreadsRepository } from './repositories/threads.repository';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ThreadsController],
  providers: [ThreadsRepository, ThreadsService],
  exports: [ThreadsService],
})
export class ThreadsModule {}
