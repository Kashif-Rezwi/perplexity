import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOpenAI } from '@ai-sdk/openai';
import {
  getOptionalTrimmedConfig,
  getPositiveIntegerConfig,
  getRequiredTrimmedConfig,
} from '../common/utils/config.util';
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
import type {
  GenerateAnswerInput,
  GenerateStandaloneSearchQueryInput,
  GenerateSuggestedFollowUpQuestionsInput,
} from './types/ai.types';
import { AiProvider } from './types/ai-provider.interface';
import {
  generateProviderAnswer,
  generateProviderStandaloneSearchQuery,
  generateProviderSuggestedFollowUpQuestions,
  streamProviderAnswer,
} from './utils/ai-provider-sdk.util';

const PROVIDER_NAME = 'OpenAI';

@Injectable()
export class OpenAiProviderService implements AiProvider {
  private readonly logger = new Logger(OpenAiProviderService.name);
  private client?: ReturnType<typeof createOpenAI>;

  constructor(private readonly configService: ConfigService) {}

  async generateAnswer(
    input: GenerateAnswerInput,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    return generateProviderAnswer({
      providerName: PROVIDER_NAME,
      model: this.getClient()(this.getModel()),
      input,
      abortSignal,
      logger: this.logger,
    });
  }

  async *streamAnswer(
    input: GenerateAnswerInput,
    abortSignal?: AbortSignal,
  ): AsyncIterable<string> {
    for await (const textPart of streamProviderAnswer({
      providerName: PROVIDER_NAME,
      model: this.getClient()(this.getModel()),
      input,
      abortSignal,
      logger: this.logger,
      timeoutMs: this.getAnswerTimeoutMs(),
    })) {
      yield textPart;
    }
  }

  async generateSuggestedFollowUpQuestions(
    input: GenerateSuggestedFollowUpQuestionsInput,
    abortSignal?: AbortSignal,
  ): Promise<string[]> {
    return generateProviderSuggestedFollowUpQuestions({
      providerName: PROVIDER_NAME,
      model: this.getClient()(this.getUtilityModel()),
      input,
      abortSignal,
      logger: this.logger,
    });
  }

  async generateStandaloneSearchQuery(
    input: GenerateStandaloneSearchQueryInput,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    return generateProviderStandaloneSearchQuery({
      providerName: PROVIDER_NAME,
      model: this.getClient()(this.getUtilityModel()),
      input,
      abortSignal,
      logger: this.logger,
    });
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
