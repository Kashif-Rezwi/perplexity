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

const SOURCE_SNIPPET_MAX_LENGTH = 1200;

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
          'Use the provided numbered sources when they are relevant. ' +
          'Cite source-supported claims with [n] markers. ' +
          'Use only citation markers from the provided sources.',
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
    `Prior thread context:\n${formatPriorTurns(input.priorTurns ?? [])}`,
    `Question:\n${input.question}`,
    `Sources:\n${formatSources(input.sources ?? [])}`,
    'Write the answer in Markdown.',
  ].join('\n\n');
}

function formatPriorTurns(priorTurns: GenerateAnswerInput['priorTurns']): string {
  if (!priorTurns?.length) {
    return 'No prior turns.';
  }

  return priorTurns
    .map((turn, index) =>
      [
        `Turn ${index + 1}`,
        `Question: ${turn.question}`,
        `Answer: ${turn.answerMarkdown}`,
      ].join('\n'),
    )
    .join('\n\n');
}

function formatSources(sources: GenerateAnswerInput['sources']): string {
  if (!sources?.length) {
    return 'No sources were returned. Answer from general knowledge only when useful, and do not include citation markers.';
  }

  return sources
    .map((source) =>
      [
        `Source [${source.citationNumber}]`,
        `Title: ${source.title}`,
        `Domain: ${source.domain}`,
        `URL: ${source.url}`,
        `Snippet: ${truncateSourceSnippet(source.snippet)}`,
      ].join('\n'),
    )
    .join('\n\n');
}

function truncateSourceSnippet(snippet: string): string {
  return snippet.length > SOURCE_SNIPPET_MAX_LENGTH
    ? `${snippet.slice(0, SOURCE_SNIPPET_MAX_LENGTH)}...`
    : snippet;
}
