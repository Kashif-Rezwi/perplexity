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
  private readonly client: ReturnType<typeof createGroq>;
  private readonly model: string;
  private readonly utilityModel: string;
  private readonly answerTimeoutMs: number;
  private readonly queryRewriteTimeoutMs: number;
  private readonly suggestionTimeoutMs: number;

  constructor(configService: ConfigService) {
    const apiKey = getRequiredTrimmedConfig(configService, GROQ_API_KEY_CONFIG_KEY);
    this.client = createGroq({ apiKey });
    this.model = getOptionalTrimmedConfig(configService, GROQ_MODEL_CONFIG_KEY, DEFAULT_GROQ_MODEL);
    this.utilityModel = getOptionalTrimmedConfig(configService, GROQ_UTILITY_MODEL_CONFIG_KEY, DEFAULT_GROQ_UTILITY_MODEL);
    this.answerTimeoutMs = getPositiveIntegerConfig(configService, GROQ_ANSWER_TIMEOUT_MS_CONFIG_KEY, DEFAULT_GROQ_ANSWER_TIMEOUT_MS);
    this.queryRewriteTimeoutMs = getPositiveIntegerConfig(configService, GROQ_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY, DEFAULT_GROQ_QUERY_REWRITE_TIMEOUT_MS);
    this.suggestionTimeoutMs = getPositiveIntegerConfig(configService, GROQ_SUGGESTION_TIMEOUT_MS_CONFIG_KEY, DEFAULT_GROQ_SUGGESTION_TIMEOUT_MS);
  }

  async generateAnswer(
    input: GenerateAnswerInput,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.client(this.model),
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
      if (error instanceof InternalServerErrorException) {
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
        model: this.client(this.model),
        abortSignal,
        timeout: this.answerTimeoutMs,
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
      if (error instanceof InternalServerErrorException) {
        throw error;
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
        model: this.client(this.utilityModel),
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
        model: this.client(this.utilityModel),
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
      if (error instanceof InternalServerErrorException) {
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
    return this.answerTimeoutMs;
  }

  getQueryRewriteTimeoutMs(): number {
    return this.queryRewriteTimeoutMs;
  }

  getSuggestionTimeoutMs(): number {
    return this.suggestionTimeoutMs;
  }
}
