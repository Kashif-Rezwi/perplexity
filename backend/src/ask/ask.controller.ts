import { Body, Controller, Post } from '@nestjs/common';
import { AskService } from './ask.service';
import { mapAskTurnSummary } from './mappers/ask-response.mapper';
import { AskRequestDto } from './dto/ask-request.dto';

@Controller('perplexity')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post('ask')
  ask(@Body() body: AskRequestDto) {
    return this.askService.ask({
      question: body.question,
      threadId: body.threadId,
    });
  }
}
