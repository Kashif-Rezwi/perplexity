import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { SearchModule } from '../search/search.module';
import { ThreadsModule } from '../threads/threads.module';
import { AskService } from './ask.service';

@Module({
  imports: [AiModule, SearchModule, ThreadsModule],
  providers: [AskService],
  exports: [AskService],
})
export class AskModule {}
