import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import type { AskInput, AskResponse } from './types/ask.types';

@Injectable()
export class AskService {
  constructor(private readonly aiService: AiService) {}

  async ask(input: AskInput): Promise<AskResponse> {
    const answerMarkdown = await this.aiService.generateAnswer(
      input.question,
    );

    return { answerMarkdown };
  }
}
