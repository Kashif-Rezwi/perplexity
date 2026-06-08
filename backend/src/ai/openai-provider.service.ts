import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, jsonSchema, Output } from 'ai';
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
import {
  sanitizeStandaloneSearchQuery,
  sanitizeSuggestedFollowUpQuestions,
  SUGGESTED_FOLLOW_UP_QUESTION_MAX_LENGTH,
} from './utils/ai-output.util';

const STANDALONE_SEARCH_QUERY_MAX_OUTPUT_TOKENS = 1000;

@Injectable()
export class OpenAiProviderService {
  private readonly logger = new Logger(OpenAiProviderService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateAnswer(
    input: GenerateAnswerInput,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    const apiKey = this.getRequiredApiKey();
    const model = this.getModel();
    const openaiClient = createOpenAI({ apiKey });

    try {
      const { text } = await generateText({
        model: openaiClient(model),
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
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `OpenAI answer generation failed: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );

      throw new ServiceUnavailableException('OpenAI answer generation failed');
    }
  }

  async generateSuggestedFollowUpQuestions(
    input: GenerateSuggestedFollowUpQuestionsInput,
    abortSignal?: AbortSignal,
  ): Promise<string[]> {
    const apiKey = this.getRequiredApiKey();
    const model = this.getUtilityModel();
    const openaiClient = createOpenAI({ apiKey });

    try {
      const { output } = await generateText({
        model: openaiClient(model),
        abortSignal,
        system: SUGGESTED_FOLLOW_UP_SYSTEM_PROMPT,
        prompt: createSuggestedFollowUpQuestionsPrompt(input),
        output: Output.array({
          element: jsonSchema<string>({
            type: 'string',
            minLength: 1,
            maxLength: SUGGESTED_FOLLOW_UP_QUESTION_MAX_LENGTH,
          }),
          name: 'suggestedFollowUpQuestions',
          description: 'Five questions the user is likely to ask next, each written from the user\'s perspective.',
        }),
      });

      return sanitizeSuggestedFollowUpQuestions(output);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn(
        `OpenAI follow-up suggestion generation failed: ${getErrorMessage(
          error,
        )}`,
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
    const apiKey = this.getRequiredApiKey();
    const model = this.getUtilityModel();
    const openaiClient = createOpenAI({ apiKey });

    try {
      const { text } = await generateText({
        model: openaiClient(model),
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
      if (error instanceof InternalServerErrorException) {
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

  private getRequiredApiKey(): string {
    return getRequiredTrimmedConfig(
      this.configService,
      OPENAI_API_KEY_CONFIG_KEY,
    );
  }

  getModel(): string {
    return getOptionalTrimmedConfig(
      this.configService,
      OPENAI_MODEL_CONFIG_KEY,
      DEFAULT_OPENAI_MODEL,
    );
  }

  getUtilityModel(): string {
    return getOptionalTrimmedConfig(
      this.configService,
      OPENAI_UTILITY_MODEL_CONFIG_KEY,
      DEFAULT_OPENAI_UTILITY_MODEL,
    );
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
}
