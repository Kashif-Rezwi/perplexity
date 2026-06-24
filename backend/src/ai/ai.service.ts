import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOptionalTrimmedConfig } from '../common/utils/config.util';
import { getErrorMessage } from '../common/utils/error.util';
import { withTimeout } from '../common/utils/with-timeout.util';
import { OpenAiProviderService } from './openai-provider.service';
import { GroqProviderService } from './groq-provider.service';
import { AiProvider } from './types/ai-provider.interface';
import type { PriorTurn } from './types/ai.types';
import type { CreateTurnSourceInput } from '../sources/types/sources.types';
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

  constructor(
    private readonly openAiProviderService: OpenAiProviderService,
    private readonly configService: ConfigService,
    private readonly groqProviderService: GroqProviderService,
  ) {}

  private resolveProvider(): { provider: AiProvider; name: string } {
    const type = getOptionalTrimmedConfig(
      this.configService,
      AI_PROVIDER_CONFIG_KEY,
      DEFAULT_AI_PROVIDER,
    ).toLowerCase();

    if (type === 'groq') {
      return { provider: this.groqProviderService, name: 'Groq' };
    }

    return { provider: this.openAiProviderService, name: 'OpenAI' };
  }

  async generateAnswer(
    question: string,
    priorTurns: PriorTurn[],
    sources: CreateTurnSourceInput[],
  ): Promise<string> {
    const { provider, name } = this.resolveProvider();
    const abortController = new AbortController();

    return withTimeout(
      provider.generateAnswer(
        { question, priorTurns, sources },
        abortController.signal,
      ),
      provider.getAnswerTimeoutMs(),
      () => new ServiceUnavailableException(`${name} answer generation timed out`),
      () => abortController.abort(),
    );
  }

  streamAnswer(
    question: string,
    priorTurns: PriorTurn[],
    sources: CreateTurnSourceInput[],
    abortSignal?: AbortSignal,
  ): AsyncIterable<string> {
    const { provider } = this.resolveProvider();

    return provider.streamAnswer(
      { question, priorTurns, sources },
      abortSignal,
    );
  }

  async resolveSearchQuery(
    question: string,
    priorTurns: PriorTurn[],
    threadTitle?: string,
  ): Promise<string> {
    if (priorTurns.length === 0) {
      return question;
    }

    const { provider, name } = this.resolveProvider();
    const abortController = new AbortController();

    try {
      return await withTimeout(
        provider.generateStandaloneSearchQuery(
          {
            question,
            threadTitle,
            priorTurns: getQueryRewritePriorTurns(priorTurns),
          },
          abortController.signal,
        ),
        provider.getQueryRewriteTimeoutMs(),
        () => new ServiceUnavailableException(`${name} search query rewrite timed out`),
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
    sources: CreateTurnSourceInput[],
  ): Promise<string[]> {
    const { provider, name } = this.resolveProvider();
    const abortController = new AbortController();

    try {
      return await withTimeout(
        provider.generateSuggestedFollowUpQuestions(
          {
            question,
            answerMarkdown,
            priorTurns,
            sources,
          },
          abortController.signal,
        ),
        provider.getSuggestionTimeoutMs(),
        () => new ServiceUnavailableException(`${name} suggestion generation timed out`),
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
}
