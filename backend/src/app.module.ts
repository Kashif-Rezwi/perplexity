import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RouterModule } from '@nestjs/core';
import { AskModule } from './ask/ask.module';
import { HealthController } from './health.controller';
import { SourcesModule } from './sources/sources.module';
import { ThreadsModule } from './threads/threads.module';

const PERPLEXITY_API_PATH = 'perplexity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    RouterModule.register([
      { path: PERPLEXITY_API_PATH, module: AskModule },
      { path: PERPLEXITY_API_PATH, module: SourcesModule },
      { path: PERPLEXITY_API_PATH, module: ThreadsModule },
    ]),
    AskModule,
    SourcesModule,
    ThreadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
