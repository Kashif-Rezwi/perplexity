import { Body, Controller, Post } from '@nestjs/common';
import { AskService } from './ask.service';
import { AskRequestDto } from './dto/ask-request.dto';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  ask(@Body() body: AskRequestDto) {
    return this.askService.ask({
      question: body.question,
      threadId: body.threadId,
    });
  }
}
