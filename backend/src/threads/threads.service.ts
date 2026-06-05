import { Injectable, NotFoundException } from '@nestjs/common';
import type { ThreadDetailResponse } from './types/thread.types';
import { mapThreadDetail } from './mappers/thread-response.mapper';
import { ThreadsRepository } from './repositories/threads.repository';

@Injectable()
export class ThreadsService {
  constructor(private readonly threadsRepository: ThreadsRepository) {}

  async getThreadDetail(threadId: string): Promise<ThreadDetailResponse> {
    const thread = await this.threadsRepository.findThreadDetailById(threadId);

    if (!thread) {
      throw new NotFoundException(`Thread ${threadId} was not found`);
    }

    return mapThreadDetail(thread);
  }
}
