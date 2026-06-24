import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TurnStatus } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { getErrorMessage, getErrorStack } from '../common/utils/error.util';
import { TavilySearchService } from '../search/tavily-search.service';
import { ThreadsService } from '../threads/threads.service';
import {
  getLatestTurn,
  getPriorTurns,
  getPriorTurnsBeforeTurn,
} from './helpers/ask-thread-context.helper';
import { prepareAnswerCitations } from './helpers/answer-citation.helper';
import { mapSearchResultsToSourceInputs } from './mappers/search-to-source.mapper';
import { mapAskResponse } from './mappers/ask-response.mapper';
import type { AskInput, AskResponse } from './types/ask.types';
import type {
  AskStreamErrorCode,
  AskStreamEvent,
  AskStreamProgressStage,
} from './types/ask-stream.types';
import {
  createAnswerPreview,
  createThreadTitle,
} from './utils/ask-text.util';

type PendingAskContext = Awaited<ReturnType<AskService['preparePendingAsk']>>;

type RetryAskInput = {
  threadId: string;
  turnId: string;
};

type AskStreamFailurePhase = 'search' | 'answer' | 'save';

const PROGRESS_MESSAGES: Record<AskStreamProgressStage, string> = {
  preparing: 'Preparing your question...',
  searching: 'Searching the web...',
  answering: 'Writing the answer...',
  saving: 'Saving the result...',
  completed: 'Answer complete.',
};

@Injectable()
export class AskService {
  private readonly logger = new Logger(AskService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly searchService: TavilySearchService,
    private readonly threadsService: ThreadsService,
  ) {}

  async ask(input: AskInput): Promise<AskResponse> {
    const context = await this.preparePendingAsk(input);
    const { thread, turn, priorTurns } = context;

    try {
      const sources = await this.searchSources(context.searchQuery);
      const answerMarkdown = await this.aiService.generateAnswer(
        input.question,
        priorTurns,
        sources,
      );

      return await this.completeAskTurn(
        context,
        input.question,
        answerMarkdown,
        sources,
      );
    } catch (error) {
      await this.handleAskFailure(thread.id, turn.id, error);
      throw error;
    }
  }

  async askStream(
    input: AskInput,
    abortSignal?: AbortSignal,
  ): Promise<AsyncIterable<AskStreamEvent>> {
    const context = await this.preparePendingAsk(input);

    return this.createAskStream(input, context, abortSignal);
  }

  async retryAskStream(
    input: RetryAskInput,
    abortSignal?: AbortSignal,
  ): Promise<AsyncIterable<AskStreamEvent>> {
    const context = await this.preparePendingRetryAsk(input);

    return this.createAskStream(
      { question: context.question },
      context,
      abortSignal,
    );
  }

  private async preparePendingAsk(input: AskInput) {
    const existingThread = input.threadId
      ? await this.loadExistingThreadOrThrow(input.threadId)
      : null;
    const priorTurns = existingThread ? getPriorTurns(existingThread) : [];
    const searchQuery = await this.aiService.resolveSearchQuery(
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

    return {
      existingThread,
      priorTurns,
      question: input.question,
      searchQuery,
      thread,
      turn,
    };
  }

  private async preparePendingRetryAsk(input: RetryAskInput) {
    const existingThread = await this.loadExistingThreadOrThrow(input.threadId);
    const failedTurn = existingThread.turns.find(
      (turn) => turn.id === input.turnId,
    );

    if (!failedTurn) {
      throw new NotFoundException(`Turn ${input.turnId} was not found`);
    }

    if (failedTurn.status !== TurnStatus.FAILED) {
      throw new BadRequestException('Only failed turns can be retried');
    }

    const priorTurns = getPriorTurnsBeforeTurn(existingThread, failedTurn.id);
    const searchQuery = await this.aiService.resolveSearchQuery(
      failedTurn.question,
      priorTurns,
      existingThread.title,
    );
    const thread = await this.threadsService.appendPendingTurnToThread({
      threadId: existingThread.id,
      question: failedTurn.question,
      searchQuery,
    });
    const turn = getLatestTurn(thread);

    return {
      existingThread,
      priorTurns,
      question: failedTurn.question,
      searchQuery,
      thread,
      turn,
    };
  }

  private async searchSources(searchQuery: string) {
    const searchResults = await this.searchService.search({
      query: searchQuery,
    });

    return mapSearchResultsToSourceInputs(searchResults);
  }

  private async completeAskTurn(
    context: PendingAskContext,
    question: string,
    rawAnswerMarkdown: string,
    sources: ReturnType<typeof mapSearchResultsToSourceInputs>,
  ): Promise<AskResponse> {
    const { thread, turn, priorTurns } = context;
    const answerCitations = prepareAnswerCitations(rawAnswerMarkdown, sources);
    const answerMarkdown = answerCitations.answerMarkdown;
    let suggestedFollowUpQuestions: string[] = [];

    try {
      suggestedFollowUpQuestions =
        await this.aiService.generateSuggestedFollowUpQuestions(
          question,
          answerMarkdown,
          priorTurns,
          sources,
        );
    } catch (error) {
      this.logger.warn(
        `Failed to generate follow-up questions for turn ${turn.id}: ${getErrorMessage(
          error,
          'Ask failed',
        )}`,
      );
    }

    await this.threadsService.completeTurn({
      threadId: thread.id,
      turnId: turn.id,
      answerMarkdown,
      answerPreview: createAnswerPreview(answerMarkdown),
      sources,
      citationNumbers: answerCitations.citationNumbers,
      suggestedFollowUpQuestions,
    });

    const data = await this.threadsService.findThreadWithSingleTurn(
      thread.id,
      turn.id,
    );

    if (!data) {
      throw new InternalServerErrorException(
        `Thread ${thread.id} or Turn ${turn.id} was not found after ask completion`,
      );
    }

    return mapAskResponse(data);
  }

  private async *createAskStream(
    input: AskInput,
    context: PendingAskContext,
    abortSignal?: AbortSignal,
  ): AsyncIterable<AskStreamEvent> {
    const { thread, turn, priorTurns, searchQuery } = context;
    let failurePhase: AskStreamFailurePhase = 'answer';

    yield {
      event: 'start',
      data: {
        threadId: thread.id,
        turnId: turn.id,
        question: input.question,
        searchQuery,
      },
    };
    yield this.createProgressEvent('preparing');

    try {
      yield this.createProgressEvent('searching');
      failurePhase = 'search';
      const sources = await this.searchSources(searchQuery);
      let answerMarkdown = '';

      yield this.createProgressEvent('answering');
      failurePhase = 'answer';
      for await (const delta of this.aiService.streamAnswer(
        input.question,
        priorTurns,
        sources,
        abortSignal,
      )) {
        answerMarkdown += delta;

        if (delta) {
          yield {
            event: 'delta',
            data: { text: delta },
          };
        }
      }

      if (!answerMarkdown.trim()) {
        throw new InternalServerErrorException('AI returned an empty answer');
      }

      yield this.createProgressEvent('saving');
      failurePhase = 'save';
      const response = await this.completeAskTurn(
        context,
        input.question,
        answerMarkdown,
        sources,
      );

      yield {
        event: 'final',
        data: response,
      };
      yield this.createProgressEvent('completed');
      yield {
        event: 'done',
        data: {},
      };
    } catch (error) {
      try {
        await this.handleAskFailure(thread.id, turn.id, error);
      } catch (failureError) {
        this.logger.error(
          `Failed to mark streamed ask as failed for thread ${thread.id}, turn ${turn.id}: ${getErrorMessage(
            failureError,
            'Failure update failed',
          )}`,
          getErrorStack(failureError),
        );
      }

      yield {
        event: 'error',
        data: this.createStreamErrorData(error, failurePhase),
      };
      yield {
        event: 'done',
        data: {},
      };
    }
  }

  private async handleAskFailure(
    threadId: string,
    turnId: string,
    error: unknown,
  ) {
    this.logger.error(
      `Ask failed for thread ${threadId}, turn ${turnId}: ${getErrorMessage(
        error,
        'Ask failed',
      )}`,
      getErrorStack(error),
    );

    await this.threadsService.failTurn({
      threadId,
      turnId,
      errorMessage: getErrorMessage(error, 'Ask failed'),
    });
  }

  private async loadExistingThreadOrThrow(threadId: string) {
    const thread = await this.threadsService.findThreadDetailById(threadId);

    if (!thread) {
      throw new NotFoundException(`Thread ${threadId} was not found`);
    }

    return thread;
  }

  private createProgressEvent(stage: AskStreamProgressStage): AskStreamEvent {
    return {
      event: 'progress',
      data: {
        stage,
        message: PROGRESS_MESSAGES[stage],
      },
    };
  }

  private createStreamErrorData(
    error: unknown,
    phase: AskStreamFailurePhase,
  ): { message: string; code: AskStreamErrorCode; retryable: boolean } {
    const message = getErrorMessage(error, 'Ask failed');
    const isTimeout = message.toLowerCase().includes('timed out');
    const codeByPhase: Record<AskStreamFailurePhase, AskStreamErrorCode> = {
      search: 'SEARCH_FAILED',
      answer: isTimeout ? 'ANSWER_TIMEOUT' : 'ANSWER_FAILED',
      save: 'SAVE_FAILED',
    };

    return {
      message,
      code: codeByPhase[phase] ?? 'ASK_FAILED',
      retryable: phase !== 'save',
    };
  }
}
