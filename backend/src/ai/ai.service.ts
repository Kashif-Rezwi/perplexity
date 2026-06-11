import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getErrorMessage } from '../common/utils/error.util';
import { withTimeout } from '../common/utils/with-timeout.util';
import { getOptionalTrimmedConfig } from '../common/utils/config.util';
import { OpenAiProviderService } from './openai-provider.service';
import { GroqProviderService } from './groq-provider.service';
import { AiProvider } from './types/ai-provider.interface';
import type { PriorTurn } from './types/ai.types';
import type { CreateTurnSourceInput } from '../sources/types/source-persistence.types';
import {
  AI_PROVIDER_CONFIG_KEY,
  DEFAULT_AI_PROVIDER,
} from './ai.constants';

const QUERY_REWRITE_PRIOR_TURN_CONTEXT_LIMIT = 3;
const QUERY_REWRITE_ANSWER_CONTEXT_MAX_LENGTH = 300;

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
  private readonly configService?: ConfigService;
  private readonly openAiProviderService: OpenAiProviderService;
  private readonly groqProviderService?: GroqProviderService;

  constructor(
    openAiProviderService: OpenAiProviderService,
    configService?: ConfigService,
    groqProviderService?: GroqProviderService,
  ) {
    this.openAiProviderService = openAiProviderService;
    this.configService = configService;
    this.groqProviderService = groqProviderService;
  }

  private getProvider(): AiProvider {
    if (!this.configService || !this.groqProviderService) {
      return this.openAiProviderService;
    }

    const providerType = getOptionalTrimmedConfig(
      this.configService,
      AI_PROVIDER_CONFIG_KEY,
      DEFAULT_AI_PROVIDER,
    ).toLowerCase();

    if (providerType === 'groq') {
      return this.groqProviderService;
    }

    return this.openAiProviderService;
  }

  private getProviderName(): string {
    if (!this.configService || !this.groqProviderService) {
      return 'OpenAI';
    }

    const providerType = getOptionalTrimmedConfig(
      this.configService,
      AI_PROVIDER_CONFIG_KEY,
      DEFAULT_AI_PROVIDER,
    ).toLowerCase();

    return providerType === 'groq' ? 'Groq' : 'OpenAI';
  }


  async generateAnswer(
    question: string,
    priorTurns: PriorTurn[],
    sources: CreateTurnSourceInput[],
  ): Promise<string> {
    const provider = this.getProvider();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      provider.getAnswerTimeoutMs(),
    );

    try {
      return await provider.generateAnswer(
        { question, priorTurns, sources },
        controller.signal,
      );
    } catch (error) {
      if (controller.signal.aborted) {
        const providerName = this.getProviderName();
        throw new ServiceUnavailableException(`${providerName} answer generation timed out`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async resolveSearchQuery(
    question: string,
    priorTurns: PriorTurn[],
    threadTitle?: string,
  ): Promise<string> {
    if (priorTurns.length === 0) {
      return question;
    }

    const provider = this.getProvider();
    try {
      return await withTimeout(
        provider.generateStandaloneSearchQuery({
          question,
          threadTitle,
          priorTurns: getQueryRewritePriorTurns(priorTurns),
        }),
        provider.getQueryRewriteTimeoutMs(),
        () => {
          const providerName = this.getProviderName();
          return new ServiceUnavailableException(`${providerName} search query rewrite timed out`);
        },
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
    sources: CreateTurnSourceInput[],
  ): Promise<string[]> {
    const provider = this.getProvider();
    try {
      return await withTimeout(
        provider.generateSuggestedFollowUpQuestions({
          question,
          answerMarkdown,
          priorTurns,
          sources,
        }),
        provider.getSuggestionTimeoutMs(),
        () => {
          const providerName = this.getProviderName();
          return new ServiceUnavailableException(`${providerName} suggestion generation timed out`);
        },
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
}

