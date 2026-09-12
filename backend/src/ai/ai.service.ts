import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createGroq } from '@ai-sdk/groq';
import {
  getOptionalTrimmedConfig,
  getPositiveIntegerConfig,
  getRequiredTrimmedConfig,
} from '../common/utils/config.util';
import { getErrorMessage } from '../common/utils/error.util';
import { withTimeout } from '../common/utils/with-timeout.util';
import type { AnswerSource, PriorTurn } from './types/ai.types';
import {
  AI_ANSWER_TIMEOUT_MS_CONFIG_KEY,
  AI_API_KEY_CONFIG_KEY,
  AI_MODEL_CONFIG_KEY,
  AI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY,
  AI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY,
  AI_UTILITY_MODEL_CONFIG_KEY,
  DEFAULT_AI_ANSWER_TIMEOUT_MS,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_QUERY_REWRITE_TIMEOUT_MS,
  DEFAULT_AI_SUGGESTION_TIMEOUT_MS,
  DEFAULT_AI_UTILITY_MODEL,
} from './ai.constants';
import {
  generateAnswer,
  generateStandaloneSearchQuery,
  generateSuggestedFollowUpQuestions,
  streamAnswer,
} from './utils/ai-sdk.util';

const QUERY_REWRITE_PRIOR_TURN_CONTEXT_LIMIT = 3;
const QUERY_REWRITE_ANSWER_CONTEXT_MAX_LENGTH = 300;

// The active model runs on Groq today, but callers only see generic `AI_*`
// config. To swap vendors later, replace the SDK client created in the
// constructor and keep this service's public API unchanged.

function truncateForQueryRewrite(value: string): string {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();

  return normalizedValue.length > QUERY_REWRITE_ANSWER_CONTEXT_MAX_LENGTH
    ? `${normalizedValue.slice(0, QUERY_REWRITE_ANSWER_CONTEXT_MAX_LENGTH)}...`
    : normalizedValue;
}

function getQueryRewritePriorTurns(priorTurns: PriorTurn[]): PriorTurn[] {
  return priorTurns
    .slice(-QUERY_REWRITE_PRIOR_TURN_CONTEXT_LIMIT)
    .map((turn) => ({
      question: turn.question,
      answerMarkdown: truncateForQueryRewrite(turn.answerMarkdown),
    }));
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client?: ReturnType<typeof createGroq>;

  constructor(private readonly configService: ConfigService) {}

  async generateAnswer(
    question: string,
    priorTurns: PriorTurn[],
    sources: AnswerSource[],
  ): Promise<string> {
    const abortController = new AbortController();

    return withTimeout(
      generateAnswer({
        model: this.getClient()(this.getModel()),
        input: { question, priorTurns, sources },
        abortSignal: abortController.signal,
        logger: this.logger,
      }),
      this.getAnswerTimeoutMs(),
      () => new ServiceUnavailableException('AI answer generation timed out'),
      () => abortController.abort(),
    );
  }

  streamAnswer(
    question: string,
    priorTurns: PriorTurn[],
    sources: AnswerSource[],
    abortSignal?: AbortSignal,
  ): AsyncIterable<string> {
    return streamAnswer({
      model: this.getClient()(this.getModel()),
      input: { question, priorTurns, sources },
      abortSignal,
      logger: this.logger,
      timeoutMs: this.getAnswerTimeoutMs(),
    });
  }

  async resolveSearchQuery(
    question: string,
    priorTurns: PriorTurn[],
    threadTitle?: string,
  ): Promise<string> {
    if (priorTurns.length === 0) {
      return question;
    }

    const abortController = new AbortController();

    try {
      return await withTimeout(
        generateStandaloneSearchQuery({
          model: this.getClient()(this.getUtilityModel()),
          input: {
            question,
            threadTitle,
            priorTurns: getQueryRewritePriorTurns(priorTurns),
          },
          abortSignal: abortController.signal,
          logger: this.logger,
        }),
        this.getQueryRewriteTimeoutMs(),
        () =>
          new ServiceUnavailableException('AI search query rewrite timed out'),
        () => abortController.abort(),
      );
    } catch (error) {
      this.logger.warn(
        `Search query rewrite failed; falling back to raw question: ${getErrorMessage(
          error,
          'Generation failed',
        )}`,
      );
      return question;
    }
  }

  async generateSuggestedFollowUpQuestions(
    question: string,
    answerMarkdown: string,
    priorTurns: PriorTurn[],
    sources: AnswerSource[],
  ): Promise<string[]> {
    const abortController = new AbortController();

    try {
      return await withTimeout(
        generateSuggestedFollowUpQuestions({
          model: this.getClient()(this.getUtilityModel()),
          input: { question, answerMarkdown, priorTurns, sources },
          abortSignal: abortController.signal,
          logger: this.logger,
        }),
        this.getSuggestionTimeoutMs(),
        () =>
          new ServiceUnavailableException('AI suggestion generation timed out'),
        () => abortController.abort(),
      );
    } catch (error) {
      this.logger.warn(
        `Suggested follow-up generation failed; returning empty suggestions: ${getErrorMessage(
          error,
          'Generation failed',
        )}`,
      );
      return [];
    }
  }

  getAnswerTimeoutMs(): number {
    return getPositiveIntegerConfig(
      this.configService,
      AI_ANSWER_TIMEOUT_MS_CONFIG_KEY,
      DEFAULT_AI_ANSWER_TIMEOUT_MS,
    );
  }

  getQueryRewriteTimeoutMs(): number {
    return getPositiveIntegerConfig(
      this.configService,
      AI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY,
      DEFAULT_AI_QUERY_REWRITE_TIMEOUT_MS,
    );
  }

  getSuggestionTimeoutMs(): number {
    return getPositiveIntegerConfig(
      this.configService,
      AI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY,
      DEFAULT_AI_SUGGESTION_TIMEOUT_MS,
    );
  }

  private getClient(): ReturnType<typeof createGroq> {
    if (!this.client) {
      const apiKey = getRequiredTrimmedConfig(
        this.configService,
        AI_API_KEY_CONFIG_KEY,
      );
      this.client = createGroq({ apiKey });
    }

    return this.client;
  }

  private getModel(): string {
    return getOptionalTrimmedConfig(
      this.configService,
      AI_MODEL_CONFIG_KEY,
      DEFAULT_AI_MODEL,
    );
  }

  private getUtilityModel(): string {
    return getOptionalTrimmedConfig(
      this.configService,
      AI_UTILITY_MODEL_CONFIG_KEY,
      DEFAULT_AI_UTILITY_MODEL,
    );
  }
}
