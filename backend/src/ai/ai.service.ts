import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import {
  DEFAULT_OPENAI_MODEL,
  OPENAI_API_KEY_CONFIG_KEY,
  OPENAI_MODEL_CONFIG_KEY,
} from './ai.constants';

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) { }

  async generateAnswer(question: string): Promise<string> {
    const apiKey = this.getRequiredApiKey();
    const model = this.getModel();
    const openaiClient = createOpenAI({ apiKey });

    try {
      const { text } = await generateText({
        model: openaiClient(model),
        system:
          'You are a concise research assistant. Answer in clear Markdown. ' +
          'Do not invent citations or sources.',
        prompt: question,
      });

      const answerMarkdown = text.trim();

      if (!answerMarkdown) {
        throw new InternalServerErrorException('OpenAI returned an empty answer');
      }

      return answerMarkdown;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new ServiceUnavailableException('OpenAI answer generation failed');
    }
  }

  private getRequiredApiKey(): string {
    const apiKey = this.configService
      .get<string>(OPENAI_API_KEY_CONFIG_KEY)
      ?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException(
        `${OPENAI_API_KEY_CONFIG_KEY} is not configured`,
      );
    }

    return apiKey;
  }

  getModel(): string {
    return (
      this.configService.get<string>(OPENAI_MODEL_CONFIG_KEY)?.trim() ||
      DEFAULT_OPENAI_MODEL
    );
  }
}
