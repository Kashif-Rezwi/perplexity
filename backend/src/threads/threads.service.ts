import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AppendPendingTurnToThreadInput,
  CompleteTurnInput,
  CreateThreadWithPendingTurnInput,
  FailTurnInput,
  ListThreadsOptions,
  RenameThreadInput,
} from './types/threads.types';
import type {
  BulkDeleteThreadsResult,
  ThreadDetailRecord,
  ThreadListResponse,
  ThreadWithSingleTurnRecord,
} from './types/threads.types';
import type {
  ThreadDetailResponse,
  ThreadSummaryItem,
} from './types/threads.types';
import {
  mapThreadDetail,
  mapThreadSummary,
} from './mappers/thread-response.mapper';
import { ThreadsRepository } from './repositories/threads.repository';

const DEFAULT_THREAD_LIST_LIMIT = 20;

/** Service boundary for all thread and turn operations. */
@Injectable()
export class ThreadsService {
  constructor(private readonly threadsRepository: ThreadsRepository) { }

  findThreadDetailById(
    threadId: string,
  ): Promise<ThreadDetailRecord | null> {
    return this.threadsRepository.findThreadDetailById(threadId);
  }

  async listThreads(
    options: ListThreadsOptions = {},
  ): Promise<ThreadListResponse> {
    if (options.mode === 'deep-research') {
      return { items: [], nextCursor: null };
    }

    const limit = options.limit ?? DEFAULT_THREAD_LIST_LIMIT;
    const threads = await this.threadsRepository.findThreads({
      limit,
      cursor: options.cursor,
      sort: options.sort ?? 'newest',
      mode: options.mode ?? 'all',
      q: options.q,
    });

    const hasNextPage = threads.length > limit;
    const items = hasNextPage ? threads.slice(0, limit) : threads;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return {
      items: items.map(mapThreadSummary),
      nextCursor,
    };
  }

  async getThreadDetail(threadId: string): Promise<ThreadDetailResponse> {
    const thread = await this.findThreadDetailById(threadId);

    if (!thread) {
      throw new NotFoundException(`Thread ${threadId} was not found`);
    }

    return mapThreadDetail(thread);
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.threadsRepository.deleteThread(threadId);
  }

  async deleteThreads(
    threadIds: string[],
  ): Promise<BulkDeleteThreadsResult> {
    const uniqueThreadIds = Array.from(new Set(threadIds));
    const deletedCount = await this.threadsRepository.deleteThreads(uniqueThreadIds);

    return {
      requestedCount: uniqueThreadIds.length,
      deletedCount,
    };
  }

  async renameThread(
    input: RenameThreadInput,
  ): Promise<ThreadSummaryItem> {
    const thread = await this.threadsRepository.renameThread(input);

    if (!thread) {
      throw new NotFoundException(`Thread ${input.threadId} was not found`);
    }

    return mapThreadSummary(thread);
  }

  findThreadWithSingleTurn(
    threadId: string,
    turnId: string,
  ): Promise<ThreadWithSingleTurnRecord | null> {
    return this.threadsRepository.findThreadWithSingleTurn(threadId, turnId);
  }

  createThreadWithPendingTurn(
    input: CreateThreadWithPendingTurnInput,
  ): Promise<ThreadDetailRecord> {
    return this.threadsRepository.createThreadWithPendingTurn(input);
  }

  appendPendingTurnToThread(
    input: AppendPendingTurnToThreadInput,
  ): Promise<ThreadDetailRecord> {
    return this.threadsRepository.appendPendingTurnToThread(input);
  }

  completeTurn(input: CompleteTurnInput): Promise<void> {
    return this.threadsRepository.completeTurn(input);
  }

  failTurn(input: FailTurnInput): Promise<void> {
    return this.threadsRepository.failTurn(input);
  }
}
