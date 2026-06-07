import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TurnStatus } from '@prisma/client';
import type { PriorTurn } from '../ai/types/ai.types';
import { AiService } from '../ai/ai.service';
import {
  createAnswerPreview,
  createThreadTitle,
} from '../common/utils/text.util';
import {
  extractCitationNumbers,
  normalizeCitationMarkers,
} from '../common/parsers/citations/citation-marker.parser';
import { SearchService } from '../search/search.service';
import {
  mapHeader,
  mapTurnDetail,
} from '../threads/mappers/thread-response.mapper';
import { ThreadsService } from '../threads/threads.service';
import type { ThreadDetailRecord } from '../threads/types/thread.types';
import { mapSearchResultsToSourceInputs } from './mappers/search-to-source.mapper';
import { mapAskTurnSummary } from './mappers/ask-response.mapper';
import type { AskInput, AskResponse } from './types/ask.types';

const PRIOR_TURN_CONTEXT_LIMIT = 5;

@Injectable()
export class AskService {
  private readonly logger = new Logger(AskService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly searchService: SearchService,
    private readonly threadsService: ThreadsService,
  ) { }

  async ask(input: AskInput): Promise<AskResponse> {
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

    let answerMarkdown: string;

    try {
      const searchResults = await this.searchService.search({
        query: searchQuery,
      });
      const sources = mapSearchResultsToSourceInputs(searchResults);
      answerMarkdown = await this.aiService.generateAnswer(
        input.question,
        priorTurns,
        sources,
      );
      const validCitationNumbers = sources.map((source) => source.citationNumber);
      // Normalize before persistence so the stored answerMarkdown contains
      // explicit individual markers (e.g. [1][2][3] rather than [1-3]).
      // extractCitationNumbers also normalizes internally, which is idempotent
      // on already-normalized text.
      answerMarkdown = normalizeCitationMarkers(
        answerMarkdown,
        validCitationNumbers,
      );
      const citationNumbers = extractCitationNumbers(
        answerMarkdown,
        validCitationNumbers,
      );
      // Attempt to generate follow-up questions but continue gracefully if it fails.
      let suggestedFollowUpQuestions: string[] = [];
      try {
        suggestedFollowUpQuestions =
          await this.aiService.generateSuggestedFollowUpQuestions(
            input.question,
            answerMarkdown,
            priorTurns,
            sources,
          );
      } catch (error) {
        this.logger.warn(
          `Failed to generate follow-up questions for turn ${turn.id}: ${getErrorMessage(error)}`,
        );
      }
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

    const data = await this.threadsService.findThreadWithSingleTurn(
      thread.id,
      turn.id,
    );

    if (!data) {
      throw new InternalServerErrorException(
        `Thread ${thread.id} or Turn ${turn.id} was not found after ask completion`,
      );
    }

    return {
      thread: mapHeader(data.thread, data.totalSourceCount),
      turn: mapAskTurnSummary(mapTurnDetail(data.turn)),
    };
  }

  private async loadExistingThreadOrThrow(threadId: string) {
    const thread = await this.threadsService.findThreadDetailById(threadId);

    if (!thread) {
      throw new NotFoundException(`Thread ${threadId} was not found`);
    }

    return thread;
  }
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ask failed';
}

function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

