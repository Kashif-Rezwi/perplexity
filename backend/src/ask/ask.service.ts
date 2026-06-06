import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { TurnStatus } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import type { PriorTurn } from '../ai/types/ai.types';
import {
  extractCitationNumbers,
  normalizeCitationMarkers,
} from '../citations/citation-marker.parser';
import { TavilySearchService } from '../search/tavily-search.service';
import { mapSearchResultsToSourceInputs } from '../sources/mappers/source-persistence.mapper';
import { mapThreadDetail } from '../threads/mappers/thread-response.mapper';
import { ThreadsRepository } from '../threads/repositories/threads.repository';
import type { ThreadDetailRecord } from '../threads/types/thread.types';
import { mapAskTurnSummary } from './mappers/ask-response.mapper';
import type { AskInput, AskResponse } from './types/ask.types';

const ANSWER_PREVIEW_MAX_LENGTH = 300;
const PRIOR_TURN_CONTEXT_LIMIT = 5;

@Injectable()
export class AskService {
  constructor(
    private readonly aiService: AiService,
    private readonly tavilySearchService: TavilySearchService,
    private readonly threadsRepository: ThreadsRepository,
  ) {}

  async ask(input: AskInput): Promise<AskResponse> {
    // TODO: Rewrite follow-up questions into standalone search queries using prior thread context.
    const searchQuery = input.question;
    const existingThread = input.threadId
      ? await this.loadExistingThreadOrThrow(input.threadId)
      : null;
    const priorTurns = existingThread ? getPriorTurns(existingThread) : [];
    const thread = existingThread
      ? await this.threadsRepository.appendPendingTurnToThread({
          threadId: existingThread.id,
          question: input.question,
          searchQuery,
        })
      : await this.threadsRepository.createThreadWithPendingTurn({
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
      answerMarkdown = await this.aiService.generateAnswer({
        question: input.question,
        priorTurns,
        sources,
      });
      const validCitationNumbers = sources.map((source) => source.citationNumber);
      answerMarkdown = normalizeCitationMarkers(
        answerMarkdown,
        validCitationNumbers,
      );
      const citationNumbers = extractCitationNumbers(
        answerMarkdown,
        validCitationNumbers,
      );
      await this.threadsRepository.completeTurn({
        threadId: thread.id,
        turnId: turn.id,
        answerMarkdown,
        answerPreview: createAnswerPreview(answerMarkdown),
        sources,
        citationNumbers,
      });
    } catch (error) {
      await this.threadsRepository.failTurn({
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
    const thread = await this.threadsRepository.findThreadDetailById(threadId);

    if (!thread) {
      throw new InternalServerErrorException(
        `Thread ${threadId} was not found after ask completion`,
      );
    }

    return thread;
  }

  private async loadExistingThreadOrThrow(threadId: string) {
    const thread = await this.threadsRepository.findThreadDetailById(threadId);

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ask failed';
}
