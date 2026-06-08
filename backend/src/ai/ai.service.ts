import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { getErrorMessage } from '../common/utils/error.util';
import { withTimeout } from '../common/utils/with-timeout.util';
import { OpenAiProviderService } from './openai-provider.service';
import type { PriorTurn } from './types/ai.types';
import type { CreateTurnSourceInput } from '../sources/types/source-persistence.types';

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

  constructor(private readonly openAiProviderService: OpenAiProviderService) {}

  async generateAnswer(
    question: string,
    priorTurns: PriorTurn[],
    sources: CreateTurnSourceInput[],
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.openAiProviderService.getAnswerTimeoutMs(),
    );

    try {
      return await this.openAiProviderService.generateAnswer(
        { question, priorTurns, sources },
        controller.signal,
      );
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ServiceUnavailableException('OpenAI answer generation timed out');
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

    try {
      return await withTimeout(
        this.openAiProviderService.generateStandaloneSearchQuery({
          question,
          threadTitle,
          priorTurns: getQueryRewritePriorTurns(priorTurns),
        }),
        this.openAiProviderService.getQueryRewriteTimeoutMs(),
        () => new ServiceUnavailableException('Search query rewrite timed out'),
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
    try {
      return await withTimeout(
        this.openAiProviderService.generateSuggestedFollowUpQuestions({
          question,
          answerMarkdown,
          priorTurns,
          sources,
        }),
        this.openAiProviderService.getSuggestionTimeoutMs(),
        () => new ServiceUnavailableException('Suggestion generation timed out'),
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
