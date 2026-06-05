import { Module } from '@nestjs/common';
import { AskModule } from '../ask/ask.module';
import { SourcesModule } from '../sources/sources.module';
import { ThreadsModule } from '../threads/threads.module';
import { PerplexityController } from './perplexity.controller';

@Module({
  imports: [AskModule, SourcesModule, ThreadsModule],
  controllers: [PerplexityController],
})
export class PerplexityModule {}
