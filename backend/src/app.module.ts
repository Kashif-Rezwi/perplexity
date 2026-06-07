import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AskModule } from './ask/ask.module';
import { SourcesModule } from './sources/sources.module';
import { ThreadsModule } from './threads/threads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    DatabaseModule,
    AskModule,
    SourcesModule,
    ThreadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }
