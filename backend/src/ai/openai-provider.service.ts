import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, jsonSchema, Output, streamText } from 'ai';
import {
  getOptionalTrimmedConfig,
  getPositiveIntegerConfig,
  getRequiredTrimmedConfig,
} from '../common/utils/config.util';
import { getErrorMessage, getErrorStack } from '../common/utils/error.util';
import {
  DEFAULT_OPENAI_ANSWER_TIMEOUT_MS,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_QUERY_REWRITE_TIMEOUT_MS,
  DEFAULT_OPENAI_SUGGESTION_TIMEOUT_MS,
  DEFAULT_OPENAI_UTILITY_MODEL,
  OPENAI_ANSWER_TIMEOUT_MS_CONFIG_KEY,
  OPENAI_API_KEY_CONFIG_KEY,
  OPENAI_MODEL_CONFIG_KEY,
  OPENAI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY,
  OPENAI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY,
  OPENAI_UTILITY_MODEL_CONFIG_KEY,
} from './ai.constants';
import {
  ANSWER_SYSTEM_PROMPT,
  createAnswerPrompt,
  createStandaloneSearchQueryPrompt,
  createSuggestedFollowUpQuestionsPrompt,
  STANDALONE_SEARCH_QUERY_SYSTEM_PROMPT,
  SUGGESTED_FOLLOW_UP_SYSTEM_PROMPT,
} from './prompts/ai-prompts';
import type {
  GenerateAnswerInput,
  GenerateStandaloneSearchQueryInput,
  GenerateSuggestedFollowUpQuestionsInput,
} from './types/ai.types';
import { AiProvider } from './types/ai-provider.interface';
import {
  sanitizeStandaloneSearchQuery,
  sanitizeSuggestedFollowUpQuestions,
  SUGGESTED_FOLLOW_UP_QUESTION_MAX_LENGTH,
} from './utils/ai-output.util';

const STANDALONE_SEARCH_QUERY_MAX_OUTPUT_TOKENS = 1000;

@Injectable()
export class OpenAiProviderService implements AiProvider {
  private readonly logger = new Logger(OpenAiProviderService.name);
  private client?: ReturnType<typeof createOpenAI>;

  constructor(private readonly configService: ConfigService) {}

  async generateAnswer(
    input: GenerateAnswerInput,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.getClient()(this.getModel()),
        abortSignal,
        system: ANSWER_SYSTEM_PROMPT,
        prompt: createAnswerPrompt(input),
      });

      const answerMarkdown = text.trim();

      if (!answerMarkdown) {
        throw new InternalServerErrorException('OpenAI returned an empty answer');
      }

      return answerMarkdown;
    } catch (error) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      this.logger.error(
        `OpenAI answer generation failed: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );

      throw new ServiceUnavailableException('OpenAI answer generation failed');
    }
  }

  async *streamAnswer(
    input: GenerateAnswerInput,
    abortSignal?: AbortSignal,
  ): AsyncIterable<string> {
    try {
      const result = streamText({
        model: this.getClient()(this.getModel()),
        abortSignal,
        timeout: this.getAnswerTimeoutMs(),
        system: ANSWER_SYSTEM_PROMPT,
        prompt: createAnswerPrompt(input),
      });
      let hasOutput = false;

      for await (const textPart of result.textStream) {
        hasOutput = true;
        yield textPart;
      }

      if (!hasOutput) {
        throw new InternalServerErrorException('OpenAI returned an empty answer');
      }
    } catch (error) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      if (isTimeoutError(error)) {
        throw new ServiceUnavailableException('OpenAI answer generation timed out');
      }

      this.logger.error(
        `OpenAI answer streaming failed: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );

      throw new ServiceUnavailableException('OpenAI answer streaming failed');
    }
  }

  async generateSuggestedFollowUpQuestions(
    input: GenerateSuggestedFollowUpQuestionsInput,
    abortSignal?: AbortSignal,
  ): Promise<string[]> {
    try {
      const { output } = await generateText({
        model: this.getClient()(this.getUtilityModel()),
        abortSignal,
        system: SUGGESTED_FOLLOW_UP_SYSTEM_PROMPT,
        prompt: createSuggestedFollowUpQuestionsPrompt(input),
        output: Output.object({
          schema: jsonSchema<{ questions: string[] }>({
            type: 'object',
            properties: {
              questions: {
                type: 'array',
                items: {
                  type: 'string',
                  minLength: 1,
                  maxLength: SUGGESTED_FOLLOW_UP_QUESTION_MAX_LENGTH,
                },
              },
            },
            required: ['questions'],
          }),
        }),
      });

      return sanitizeSuggestedFollowUpQuestions(output.questions);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn(
        `OpenAI follow-up suggestion generation failed: ${getErrorMessage(error)}`,
      );

      throw new ServiceUnavailableException(
        'OpenAI follow-up suggestion generation failed',
      );
    }
  }

  async generateStandaloneSearchQuery(
    input: GenerateStandaloneSearchQueryInput,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.getClient()(this.getUtilityModel()),
        abortSignal,
        maxOutputTokens: STANDALONE_SEARCH_QUERY_MAX_OUTPUT_TOKENS,
        system: STANDALONE_SEARCH_QUERY_SYSTEM_PROMPT,
        prompt: createStandaloneSearchQueryPrompt(input),
      });
      const searchQuery = sanitizeStandaloneSearchQuery(text);

      if (!searchQuery) {
        throw new InternalServerErrorException(
          'OpenAI returned an empty search query',
        );
      }

      return searchQuery;
    } catch (error) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      this.logger.warn(
        `OpenAI search query generation failed: ${getErrorMessage(error)}`,
      );

      throw new ServiceUnavailableException(
        'OpenAI search query generation failed',
      );
    }
  }

  getAnswerTimeoutMs(): number {
    return getPositiveIntegerConfig(
      this.configService,
      OPENAI_ANSWER_TIMEOUT_MS_CONFIG_KEY,
      DEFAULT_OPENAI_ANSWER_TIMEOUT_MS,
    );
  }

  getQueryRewriteTimeoutMs(): number {
    return getPositiveIntegerConfig(
      this.configService,
      OPENAI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY,
      DEFAULT_OPENAI_QUERY_REWRITE_TIMEOUT_MS,
    );
  }

  getSuggestionTimeoutMs(): number {
    return getPositiveIntegerConfig(
      this.configService,
      OPENAI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY,
      DEFAULT_OPENAI_SUGGESTION_TIMEOUT_MS,
    );
  }

  private getClient(): ReturnType<typeof createOpenAI> {
    if (!this.client) {
      const apiKey = getRequiredTrimmedConfig(
        this.configService,
        OPENAI_API_KEY_CONFIG_KEY,
      );
      this.client = createOpenAI({ apiKey });
    }

    return this.client;
  }

  private getModel(): string {
    return getOptionalTrimmedConfig(
      this.configService,
      OPENAI_MODEL_CONFIG_KEY,
      DEFAULT_OPENAI_MODEL,
    );
  }

  private getUtilityModel(): string {
    return getOptionalTrimmedConfig(
      this.configService,
      OPENAI_UTILITY_MODEL_CONFIG_KEY,
      DEFAULT_OPENAI_UTILITY_MODEL,
    );
  }
}

function isTimeoutError(error: unknown): boolean {
  return getErrorMessage(error).toLowerCase().includes('timed out');
}
