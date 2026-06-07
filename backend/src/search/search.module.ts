import { Module } from '@nestjs/common';
import { WebSearchService } from './web-search.service';

import { SearchService } from './search.service';

@Module({
  providers: [
    {
      provide: SearchService,
      useClass: WebSearchService,
    },
  ],
  exports: [SearchService],
})
export class SearchModule { }
