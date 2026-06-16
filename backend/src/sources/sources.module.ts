import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SourcesController } from './sources.controller';
import { SourcesRepository } from './repositories/sources.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [SourcesController],
  providers: [SourcesRepository],
})
export class SourcesModule {}
