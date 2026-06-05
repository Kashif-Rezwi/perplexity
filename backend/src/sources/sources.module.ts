import { Module } from '@nestjs/common';
import { SourcesRepository } from './repositories/sources.repository';
import { SourcesService } from './sources.service';

@Module({
  providers: [SourcesRepository, SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}
