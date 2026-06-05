import { Module } from '@nestjs/common';
import { SourcesModule } from '../sources/sources.module';
import { ThreadsModule } from '../threads/threads.module';
import { PerplexityController } from './perplexity.controller';

@Module({
  imports: [SourcesModule, ThreadsModule],
  controllers: [PerplexityController],
})
export class PerplexityModule {}
