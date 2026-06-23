import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AskService } from './ask.service';
import { AskRequestDto } from './dto/ask-request.dto';
import { RetryAskRequestDto } from './dto/retry-ask-request.dto';
import type { AskStreamEvent } from './types/ask-stream.types';

type SseResponse = {
  status: (code: number) => SseResponse;
  setHeader: (name: string, value: string) => void;
  flushHeaders?: () => void;
  write: (chunk: string) => void;
  end: () => void;
  on: (event: 'close', listener: () => void) => SseResponse;
  off?: (event: 'close', listener: () => void) => SseResponse;
  removeListener?: (event: 'close', listener: () => void) => SseResponse;
  writableEnded: boolean;
};

type SseRequest = {
  aborted?: boolean;
  on: (event: 'aborted', listener: () => void) => SseRequest;
  off?: (event: 'aborted', listener: () => void) => SseRequest;
  removeListener?: (
    event: 'aborted',
    listener: () => void,
  ) => SseRequest;
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
  async askStream(
    @Body() body: AskRequestDto,
    @Req() request: SseRequest,
    @Res() response: SseResponse,
  ) {
    const abortController = new AbortController();
    const cleanupAbortListeners = this.bindSseAbort(
      request,
      response,
      abortController,
    );

    try {
      const events = await this.askService.askStream(
        {
          question: body.question,
          threadId: body.threadId,
        },
        abortController.signal,
      );

      await this.writeSseEvents(response, events, abortController.signal);
    } finally {
      cleanupAbortListeners();
    }
  }

  @Post('retry')
  async retryAskStream(
    @Body() body: RetryAskRequestDto,
    @Req() request: SseRequest,
    @Res() response: SseResponse,
  ) {
    const abortController = new AbortController();
    const cleanupAbortListeners = this.bindSseAbort(
      request,
      response,
      abortController,
    );

    try {
      const events = await this.askService.retryAskStream(
        {
          threadId: body.threadId,
          turnId: body.turnId,
        },
        abortController.signal,
      );

      await this.writeSseEvents(response, events, abortController.signal);
    } finally {
      cleanupAbortListeners();
    }
  }

  private async writeSseEvents(
    response: SseResponse,
    events: AsyncIterable<AskStreamEvent>,
    abortSignal?: AbortSignal,
  ) {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();

    try {
      for await (const event of events) {
        if (response.writableEnded || abortSignal?.aborted) {
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

  private bindSseAbort(
    request: SseRequest,
    response: SseResponse,
    abortController: AbortController,
  ): () => void {
    const abort = () => {
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
    };

    response.on('close', abort);
    request.on('aborted', abort);

    return () => {
      if (response.off) {
        response.off('close', abort);
      } else {
        response.removeListener?.('close', abort);
      }

      if (request.off) {
        request.off('aborted', abort);
        return;
      }

      request.removeListener?.('aborted', abort);
    };
  }
}
