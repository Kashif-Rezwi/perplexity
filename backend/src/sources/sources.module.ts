import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SourcesController } from './sources.controller';
import { SourcesRepository } from './repositories/sources.repository';
import { SourcesService } from './sources.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SourcesController],
  providers: [SourcesRepository, SourcesService],
})
export class SourcesModule {}
