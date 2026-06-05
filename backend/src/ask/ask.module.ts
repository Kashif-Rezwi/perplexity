import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ThreadsModule } from '../threads/threads.module';
import { AskService } from './ask.service';

@Module({
  imports: [AiModule, ThreadsModule],
  providers: [AskService],
  exports: [AskService],
})
export class AskModule {}
