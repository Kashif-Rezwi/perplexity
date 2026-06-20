import { Body, Controller, Post, Res } from '@nestjs/common';
import { AskService } from './ask.service';
import { AskRequestDto } from './dto/ask-request.dto';
import type { AskStreamEvent } from './types/ask-stream.types';

type SseResponse = {
  status: (code: number) => SseResponse;
  setHeader: (name: string, value: string) => void;
  flushHeaders?: () => void;
  write: (chunk: string) => void;
  end: () => void;
  writableEnded: boolean;
};

function formatSseEvent({ event, data }: AskStreamEvent): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

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

  @Post('stream')
  async askStream(@Body() body: AskRequestDto, @Res() response: SseResponse) {
    const events = await this.askService.askStream({
      question: body.question,
      threadId: body.threadId,
    });

    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();

    try {
      for await (const event of events) {
        if (response.writableEnded) {
          break;
        }

        response.write(formatSseEvent(event));
      }
    } finally {
      if (!response.writableEnded) {
        response.end();
      }
    }
  }
}
