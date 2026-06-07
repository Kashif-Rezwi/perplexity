import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AppendPendingTurnToThreadInput,
  CompleteTurnInput,
  CreateThreadWithPendingTurnInput,
  FailTurnInput,
} from './types/thread-command.types';
import type {
  ThreadDetailRecord,
  ThreadWithSingleTurnRecord,
} from './types/thread-record.types';
import type {
  ThreadDetailResponse,
} from './types/thread-response.types';
import { mapThreadDetail } from './mappers/thread-response.mapper';
import { ThreadsRepository } from './repositories/threads.repository';

@Injectable()
export class ThreadsService {
  constructor(private readonly threadsRepository: ThreadsRepository) {}

  findThreadDetailById(
    threadId: string,
  ): Promise<ThreadDetailRecord | null> {
    return this.threadsRepository.findThreadDetailById(threadId);
  }

  async getThreadDetail(threadId: string): Promise<ThreadDetailResponse> {
    const thread = await this.findThreadDetailById(threadId);

    if (!thread) {
      throw new NotFoundException(`Thread ${threadId} was not found`);
    }

    return mapThreadDetail(thread);
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
