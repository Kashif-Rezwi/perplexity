import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TurnStatus } from '@prisma/client';
import {
  DEFAULT_OPENAI_ANSWER_TIMEOUT_MS,
  DEFAULT_OPENAI_QUERY_REWRITE_TIMEOUT_MS,
  DEFAULT_OPENAI_SUGGESTION_TIMEOUT_MS,
} from '../ai/ai.constants';
import { AiService } from '../ai/ai.service';
import type {
  GenerateSuggestedFollowUpQuestionsInput,
  PriorTurn,
} from '../ai/types/ai.types';
import {
  extractCitationNumbers,
  normalizeCitationMarkers,
} from '../citations/citation-marker.parser';
import { withTimeout } from '../common/with-timeout';
import { TavilySearchService } from '../search/tavily-search.service';
import { mapThreadDetail } from '../threads/mappers/thread-response.mapper';
import { ThreadsService } from '../threads/threads.service';
import type { ThreadDetailRecord } from '../threads/types/thread.types';
import { mapSearchResultsToSourceInputs } from './mappers/search-to-source.mapper';
import { mapAskTurnSummary } from './mappers/ask-response.mapper';
import type { AskInput, AskResponse } from './types/ask.types';

const ANSWER_PREVIEW_MAX_LENGTH = 300;
const PRIOR_TURN_CONTEXT_LIMIT = 5;
const QUERY_REWRITE_PRIOR_TURN_CONTEXT_LIMIT = 3;
const QUERY_REWRITE_ANSWER_CONTEXT_MAX_LENGTH = 300;

@Injectable()
export class AskService {
  private readonly logger = new Logger(AskService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly tavilySearchService: TavilySearchService,
    private readonly threadsService: ThreadsService,
  ) {}

  async ask(input: AskInput): Promise<AskResponse> {
    const existingThread = input.threadId
      ? await this.loadExistingThreadOrThrow(input.threadId)
      : null;
    const priorTurns = existingThread ? getPriorTurns(existingThread) : [];
    const searchQuery = await this.resolveSearchQuery(
      input.question,
      priorTurns,
      existingThread?.title,
    );
    const thread = existingThread
      ? await this.threadsService.appendPendingTurnToThread({
          threadId: existingThread.id,
          question: input.question,
          searchQuery,
        })
      : await this.threadsService.createThreadWithPendingTurn({
          title: createThreadTitle(input.question),
          question: input.question,
          searchQuery,
        });
    const turn = getLatestTurn(thread);

    let answerMarkdown: string;

    try {
      const searchResults = await this.tavilySearchService.search({
        query: searchQuery,
      });
      const sources = mapSearchResultsToSourceInputs(searchResults);
      answerMarkdown = await withTimeout(
        this.aiService.generateAnswer({
          question: input.question,
          priorTurns,
          sources,
        }),
        this.getAnswerGenerationTimeoutMs(),
        () =>
          new ServiceUnavailableException(
            'OpenAI answer generation timed out',
          ),
      );
      const validCitationNumbers = sources.map((source) => source.citationNumber);
      answerMarkdown = normalizeCitationMarkers(
        answerMarkdown,
        validCitationNumbers,
      );
      const citationNumbers = extractCitationNumbers(
        answerMarkdown,
        validCitationNumbers,
      );
      const suggestedFollowUpQuestions =
        await this.generateSuggestedFollowUpQuestions({
          question: input.question,
          answerMarkdown,
          priorTurns,
          sources,
        });
      await this.threadsService.completeTurn({
        threadId: thread.id,
        turnId: turn.id,
        answerMarkdown,
        answerPreview: createAnswerPreview(answerMarkdown),
        sources,
        citationNumbers,
        suggestedFollowUpQuestions,
      });
    } catch (error) {
      this.logger.error(
        `Ask failed for thread ${thread.id}, turn ${turn.id}: ${getErrorMessage(
          error,
        )}`,
        getErrorStack(error),
      );

      await this.threadsService.failTurn({
        threadId: thread.id,
        turnId: turn.id,
        errorMessage: getErrorMessage(error),
      });

      throw error;
    }

    const completedThread = await this.loadThreadOrThrow(thread.id);
    const response = mapThreadDetail(completedThread);
    const { turns, ...threadSummary } = response;
    const completedTurn = turns.find(
      (candidateTurn) => candidateTurn.turnId === turn.id,
    );

    if (!completedTurn) {
      throw new InternalServerErrorException(
        `Turn ${turn.id} was not found after ask completion`,
      );
    }

    return {
      thread: threadSummary,
      turn: mapAskTurnSummary(completedTurn),
    };
  }

  private async loadThreadOrThrow(threadId: string) {
    const thread = await this.threadsService.findThreadDetailById(threadId);

    if (!thread) {
      throw new InternalServerErrorException(
        `Thread ${threadId} was not found after ask completion`,
      );
    }

    return thread;
  }

  private async generateSuggestedFollowUpQuestions(
    input: GenerateSuggestedFollowUpQuestionsInput,
  ): Promise<string[]> {
    try {
      return await withTimeout(
        this.aiService.generateSuggestedFollowUpQuestions(input),
        this.getSuggestionTimeoutMs(),
        () =>
          new ServiceUnavailableException(
            'OpenAI follow-up suggestion generation timed out',
          ),
      );
    } catch (error) {
      this.logger.warn(
        `Suggested follow-up generation failed; returning empty suggestions: ${getErrorMessage(
          error,
        )}`,
      );
      return [];
    }
  }

  private async resolveSearchQuery(
    question: string,
    priorTurns: PriorTurn[],
    threadTitle?: string,
  ): Promise<string> {
    if (priorTurns.length === 0) {
      return question;
    }

    try {
      return await withTimeout(
        this.aiService.generateStandaloneSearchQuery({
          question,
          threadTitle,
          priorTurns: getQueryRewritePriorTurns(priorTurns),
        }),
        this.getQueryRewriteTimeoutMs(),
        () =>
          new ServiceUnavailableException(
            'OpenAI search query generation timed out',
          ),
      );
    } catch (error) {
      this.logger.warn(
        `Search query rewrite failed; falling back to raw question: ${getErrorMessage(
          error,
        )}`,
      );
      return question;
    }
  }

  private getAnswerGenerationTimeoutMs(): number {
    return getAiServiceTimeoutMs(
      this.aiService,
      'getAnswerTimeoutMs',
      DEFAULT_OPENAI_ANSWER_TIMEOUT_MS,
    );
  }

  private getQueryRewriteTimeoutMs(): number {
    return getAiServiceTimeoutMs(
      this.aiService,
      'getQueryRewriteTimeoutMs',
      DEFAULT_OPENAI_QUERY_REWRITE_TIMEOUT_MS,
    );
  }

  private getSuggestionTimeoutMs(): number {
    return getAiServiceTimeoutMs(
      this.aiService,
      'getSuggestionTimeoutMs',
      DEFAULT_OPENAI_SUGGESTION_TIMEOUT_MS,
    );
  }

  private async loadExistingThreadOrThrow(threadId: string) {
    const thread = await this.threadsService.findThreadDetailById(threadId);

    if (!thread) {
      throw new NotFoundException(`Thread ${threadId} was not found`);
    }

    return thread;
  }
}

function createThreadTitle(question: string): string {
  return question.length > 80 ? `${question.slice(0, 77)}...` : question;
}

function createAnswerPreview(answerMarkdown: string): string {
  return answerMarkdown.length > ANSWER_PREVIEW_MAX_LENGTH
    ? answerMarkdown.slice(0, ANSWER_PREVIEW_MAX_LENGTH)
    : answerMarkdown;
}

function getLatestTurn(thread: { turns: { id: string }[] }): { id: string } {
  const turn = thread.turns[thread.turns.length - 1];

  if (!turn) {
    throw new InternalServerErrorException('Thread was created without a turn');
  }

  return turn;
}

function getPriorTurns(thread: ThreadDetailRecord): PriorTurn[] {
  return thread.turns
    .filter(
      (turn) =>
        turn.status === TurnStatus.COMPLETED && turn.answerMarkdown !== null,
    )
    .slice(-PRIOR_TURN_CONTEXT_LIMIT)
    .map((turn) => ({
      question: turn.question,
      answerMarkdown: turn.answerMarkdown as string,
    }));
}

function getQueryRewritePriorTurns(priorTurns: PriorTurn[]): PriorTurn[] {
  return priorTurns
    .slice(-QUERY_REWRITE_PRIOR_TURN_CONTEXT_LIMIT)
    .map((turn) => ({
      question: turn.question,
      answerMarkdown: truncateForQueryRewrite(turn.answerMarkdown),
    }));
}

function truncateForQueryRewrite(value: string): string {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();

  return normalizedValue.length > QUERY_REWRITE_ANSWER_CONTEXT_MAX_LENGTH
    ? `${normalizedValue.slice(0, QUERY_REWRITE_ANSWER_CONTEXT_MAX_LENGTH)}...`
    : normalizedValue;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ask failed';
}

function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

function getAiServiceTimeoutMs(
  aiService: AiService,
  methodName:
    | 'getAnswerTimeoutMs'
    | 'getQueryRewriteTimeoutMs'
    | 'getSuggestionTimeoutMs',
  fallbackMs: number,
): number {
  const method = (aiService as unknown as Record<string, unknown>)[methodName];

  return typeof method === 'function'
    ? (method.call(aiService) as number)
    : fallbackMs;
}
