import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { SearchModule } from '../search/search.module';
import { ThreadsModule } from '../threads/threads.module';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';

@Module({
  imports: [AiModule, SearchModule, ThreadsModule],
  controllers: [AskController],
  providers: [AskService],
})
export class AskModule {}
