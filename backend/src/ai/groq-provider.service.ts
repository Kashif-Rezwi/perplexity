import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createGroq } from '@ai-sdk/groq';
import {
  getOptionalTrimmedConfig,
  getPositiveIntegerConfig,
  getRequiredTrimmedConfig,
} from '../common/utils/config.util';
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
  SUGGESTED_FOLLOW_UP_SYSTEM_PROMPT,
} from './prompts/ai-prompts';
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

const PROVIDER_NAME = 'Groq';
const GROQ_SUGGESTION_SYSTEM_PROMPT =
  `${SUGGESTED_FOLLOW_UP_SYSTEM_PROMPT} Output the response as a JSON object containing a "questions" array.`;

@Injectable()
export class GroqProviderService implements AiProvider {
  private readonly logger = new Logger(GroqProviderService.name);
  private client?: ReturnType<typeof createGroq>;

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
      systemPrompt: GROQ_SUGGESTION_SYSTEM_PROMPT,
      providerOptions: {
        groq: {
          structuredOutputs: false,
        },
      },
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
