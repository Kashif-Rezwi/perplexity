import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { TavilySearchService } from '../search/tavily-search.service';
import { mapThreadDetail } from '../threads/mappers/thread-response.mapper';
import { ThreadsRepository } from '../threads/repositories/threads.repository';
import type { AskInput, AskResponse } from './types/ask.types';

const ANSWER_PREVIEW_MAX_LENGTH = 300;

@Injectable()
export class AskService {
  constructor(
    private readonly aiService: AiService,
    private readonly tavilySearchService: TavilySearchService,
    private readonly threadsRepository: ThreadsRepository,
  ) { }

  async ask(input: AskInput): Promise<AskResponse> {
    const searchQuery = input.question;
    const thread = await this.threadsRepository.createThreadWithPendingTurn({
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
      // console.log(JSON.stringify(searchResults, null, 2));
      answerMarkdown = await this.aiService.generateAnswer({
        question: input.question,
        searchResults,
      });
      await this.threadsRepository.completeTurn({
        threadId: thread.id,
        turnId: turn.id,
        answerMarkdown,
        answerPreview: createAnswerPreview(answerMarkdown),
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
    const completedTurn = turns[turns.length - 1];

    if (!completedTurn) {
      throw new InternalServerErrorException(
        `Thread ${thread.id} was loaded without turns after ask completion`,
      );
    }

    return {
      thread: threadSummary,
      turn: completedTurn,
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ask failed';
}
