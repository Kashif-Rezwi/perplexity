import { Controller, Get, Query } from '@nestjs/common';
import { RecentsQueryDto } from './dto/recents-query.dto';
import { ThreadsService } from '../threads/threads.service';

@Controller('perplexity')
export class PerplexityController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Get('recents')
  listRecents(@Query() query: RecentsQueryDto) {
    return this.threadsService.listRecents({ limit: query.limit });
  }
}
