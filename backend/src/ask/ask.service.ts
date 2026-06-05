import { Injectable } from '@nestjs/common';
import { aiService } from 'src/ai/ai.service';
import type { AskInput, AskResponse } from './types/ask.types';

@Injectable()
export class AskService {
  constructor(private readonly aiService: aiService) { }

  async ask(input: AskInput): Promise<AskResponse> {
    const answerMarkdown = await this.aiService.generateAnswer(
      input.question,
    );

    return { answerMarkdown };
  }
}
