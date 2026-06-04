import { Module } from '@nestjs/common';
import { ThreadsModule } from '../threads/threads.module';
import { PerplexityController } from './perplexity.controller';

@Module({
  imports: [ThreadsModule],
  controllers: [PerplexityController],
})
export class PerplexityModule {}
