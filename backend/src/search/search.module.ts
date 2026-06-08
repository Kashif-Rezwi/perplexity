import { Module } from '@nestjs/common';
import { TavilySearchService } from './tavily-search.service';

@Module({
  providers: [TavilySearchService],
  exports: [TavilySearchService],
})
export class SearchModule {}
