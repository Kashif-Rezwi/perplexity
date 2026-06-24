import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createGroq } from '@ai-sdk/groq';
import { generateText, jsonSchema, Output, streamText } from 'ai';
import {
  getOptionalTrimmedConfig,
  getPositiveIntegerConfig,
  getRequiredTrimmedConfig,
} from '../common/utils/config.util';
import { getErrorMessage, getErrorStack } from '../common/utils/error.util';
import {
  DEFAULT_GROQ_ANSWER_TIMEOUT_MS,
  DEFAULT_GROQ_MODEL,
  DEFAULT_GROQ_QUERY_REWRITE_TIMEOUT_MS,
  DEFAULT_GROQ_SUGGESTION_TIMEOUT_MS,
  DEFAULT_GROQ_UTILITY_MODEL,
  GROQ_ANSWER_TIMEOUT_MS_CONFIG_KEY,
  GROQ_API_KEY_CONFIG_KEY,
  GROQ_MODEL_CONFIG_KEY,
  GROQ_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY,
  GROQ_SUGGESTION_TIMEOUT_MS_CONFIG_KEY,
  GROQ_UTILITY_MODEL_CONFIG_KEY,
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
export class GroqProviderService implements AiProvider {
  private readonly logger = new Logger(GroqProviderService.name);
  private client?: ReturnType<typeof createGroq>;

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
        throw new InternalServerErrorException('Groq returned an empty answer');
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
        `Groq answer generation failed: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );

      throw new ServiceUnavailableException('Groq answer generation failed');
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
        throw new InternalServerErrorException('Groq returned an empty answer');
      }
    } catch (error) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      if (isTimeoutError(error)) {
        throw new ServiceUnavailableException('Groq answer generation timed out');
      }

      this.logger.error(
        `Groq answer streaming failed: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );

      throw new ServiceUnavailableException('Groq answer streaming failed');
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
        system: SUGGESTED_FOLLOW_UP_SYSTEM_PROMPT + ' Output the response as a JSON object containing a "questions" array.',
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
        providerOptions: {
          groq: {
            structuredOutputs: false,
          },
        },
      });

      return sanitizeSuggestedFollowUpQuestions(output.questions);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn(
        `Groq follow-up suggestion generation failed: ${getErrorMessage(error)}`,
      );

      throw new ServiceUnavailableException(
        'Groq follow-up suggestion generation failed',
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
          'Groq returned an empty search query',
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
        `Groq search query generation failed: ${getErrorMessage(error)}`,
      );

      throw new ServiceUnavailableException(
        'Groq search query generation failed',
      );
    }
  }

  getAnswerTimeoutMs(): number {
    return getPositiveIntegerConfig(
      this.configService,
      GROQ_ANSWER_TIMEOUT_MS_CONFIG_KEY,
      DEFAULT_GROQ_ANSWER_TIMEOUT_MS,
    );
  }

  getQueryRewriteTimeoutMs(): number {
    return getPositiveIntegerConfig(
      this.configService,
      GROQ_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY,
      DEFAULT_GROQ_QUERY_REWRITE_TIMEOUT_MS,
    );
  }

  getSuggestionTimeoutMs(): number {
    return getPositiveIntegerConfig(
      this.configService,
      GROQ_SUGGESTION_TIMEOUT_MS_CONFIG_KEY,
      DEFAULT_GROQ_SUGGESTION_TIMEOUT_MS,
    );
  }

  private getClient(): ReturnType<typeof createGroq> {
    if (!this.client) {
      const apiKey = getRequiredTrimmedConfig(
        this.configService,
        GROQ_API_KEY_CONFIG_KEY,
      );
      this.client = createGroq({ apiKey });
    }

    return this.client;
  }

  private getModel(): string {
    return getOptionalTrimmedConfig(
      this.configService,
      GROQ_MODEL_CONFIG_KEY,
      DEFAULT_GROQ_MODEL,
    );
  }

  private getUtilityModel(): string {
    return getOptionalTrimmedConfig(
      this.configService,
      GROQ_UTILITY_MODEL_CONFIG_KEY,
      DEFAULT_GROQ_UTILITY_MODEL,
    );
  }
}

function isTimeoutError(error: unknown): boolean {
  return getErrorMessage(error).toLowerCase().includes('timed out');
}
