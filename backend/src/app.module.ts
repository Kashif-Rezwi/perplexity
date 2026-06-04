import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { PerplexityModule } from './perplexity/perplexity.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    PerplexityModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }
