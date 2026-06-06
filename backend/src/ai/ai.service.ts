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
import type { GenerateAnswerInput } from './types/ai.types';

const SEARCH_RESULT_CONTENT_MAX_LENGTH = 1200;

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  async generateAnswer(input: GenerateAnswerInput): Promise<string> {
    const apiKey = this.getRequiredApiKey();
    const model = this.getModel();
    const openaiClient = createOpenAI({ apiKey });

    try {
      const { text } = await generateText({
        model: openaiClient(model),
        system:
          'You are a concise research assistant. Answer in clear Markdown. ' +
          'Use the provided web search results when they are relevant. ' +
          'Do not invent citation markers, citations, URLs, or source claims.',
        prompt: createAnswerPrompt(input),
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

function createAnswerPrompt(input: GenerateAnswerInput): string {
  return [
    `Question:\n${input.question}`,
    `Web search results:\n${formatSearchResults(input.searchResults ?? [])}`,
    'Write the answer in Markdown.',
  ].join('\n\n');
}

function formatSearchResults(searchResults: GenerateAnswerInput['searchResults']): string {
  if (!searchResults?.length) {
    return 'No web search results were returned. Answer from general knowledge only when useful, and do not claim web sources were found.';
  }

  return searchResults
    .map((result, index) =>
      [
        `Result ${index + 1}`,
        `Title: ${result.title}`,
        `URL: ${result.url}`,
        `Content: ${truncateSearchContent(result.content)}`,
      ].join('\n'),
    )
    .join('\n\n');
}

function truncateSearchContent(content: string): string {
  return content.length > SEARCH_RESULT_CONTENT_MAX_LENGTH
    ? `${content.slice(0, SEARCH_RESULT_CONTENT_MAX_LENGTH)}...`
    : content;
}
