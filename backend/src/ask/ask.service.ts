import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { getErrorMessage, getErrorStack } from '../common/utils/error.util';
import { TavilySearchService } from '../search/tavily-search.service';
import { ThreadsService } from '../threads/threads.service';
import {
  getLatestTurn,
  getPriorTurns,
} from './helpers/ask-thread-context.helper';
import { prepareAnswerCitations } from './helpers/answer-citation.helper';
import { mapSearchResultsToSourceInputs } from './mappers/search-to-source.mapper';
import { mapAskResponse } from './mappers/ask-response.mapper';
import type { AskInput, AskResponse } from './types/ask.types';
import type { AskStreamEvent } from './types/ask-stream.types';
import {
  createAnswerPreview,
  createThreadTitle,
} from './utils/ask-text.util';

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

  async askStream(input: AskInput): Promise<AsyncIterable<AskStreamEvent>> {
    const context = await this.preparePendingAsk(input);

    return this.createAskStream(input, context);
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
    context: Awaited<ReturnType<AskService['preparePendingAsk']>>,
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
    context: Awaited<ReturnType<AskService['preparePendingAsk']>>,
  ): AsyncIterable<AskStreamEvent> {
    const { thread, turn, priorTurns, searchQuery } = context;

    yield {
      event: 'start',
      data: {
        threadId: thread.id,
        turnId: turn.id,
        question: input.question,
        searchQuery,
      },
    };

    try {
      const sources = await this.searchSources(searchQuery);
      let answerMarkdown = '';

      for await (const delta of this.aiService.streamAnswer(
        input.question,
        priorTurns,
        sources,
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
      yield {
        event: 'done',
        data: {},
      };
    } catch (error) {
      await this.handleAskFailure(thread.id, turn.id, error);
      yield {
        event: 'error',
        data: {
          message: getErrorMessage(error, 'Ask failed'),
        },
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
}
