import { Injectable } from '@nestjs/common';
import { ThreadStatus, TurnStatus } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import type {
  AppendPendingTurnToThreadInput,
  CompleteTurnInput,
  CreateThreadWithPendingTurnInput,
  FailTurnInput,
  ThreadDetailRecord,
  TurnDetailRecord,
} from '../types/thread.types';
import { threadDetailInclude, turnDetailInclude } from '../types/thread.types';

@Injectable()
export class ThreadsRepository {
  constructor(private readonly database: DatabaseService) { }

  createThreadWithPendingTurn(
    input: CreateThreadWithPendingTurnInput,
  ): Promise<ThreadDetailRecord> {
    return this.database.thread.create({
      data: {
        title: input.title,
        status: ThreadStatus.RUNNING,
        turns: {
          create: {
            question: input.question,
            searchQuery: input.searchQuery,
            status: TurnStatus.PENDING,
          },
        },
      },
      include: threadDetailInclude,
    });
  }

  appendPendingTurnToThread(
    input: AppendPendingTurnToThreadInput,
  ): Promise<ThreadDetailRecord> {
    return this.database.thread.update({
      where: { id: input.threadId },
      data: {
        status: ThreadStatus.RUNNING,
        turns: {
          create: {
            question: input.question,
            searchQuery: input.searchQuery,
            status: TurnStatus.PENDING,
          },
        },
      },
      include: threadDetailInclude,
    });
  }

  async completeTurn(input: CompleteTurnInput): Promise<void> {
    await this.database.$transaction(async (tx) => {
      const sourceIdsByCitationNumber = new Map<number, string>();

      for (const source of input.sources) {
        const createdSource = await tx.source.create({
          data: {
            ...source,
            turnId: input.turnId,
          },
          select: {
            id: true,
            citationNumber: true,
          },
        });

        sourceIdsByCitationNumber.set(
          createdSource.citationNumber,
          createdSource.id,
        );
      }

      const citations = input.citationNumbers.flatMap((citationNumber) => {
        const sourceId = sourceIdsByCitationNumber.get(citationNumber);

        return sourceId
          ? [
            {
              turnId: input.turnId,
              sourceId,
              citationNumber,
            },
          ]
          : [];
      });

      if (citations.length > 0) {
        await tx.citation.createMany({ data: citations });
      }

      await tx.turn.update({
        where: { id: input.turnId },
        data: {
          answerMarkdown: input.answerMarkdown,
          suggestedFollowUpQuestions: input.suggestedFollowUpQuestions,
          status: TurnStatus.COMPLETED,
          errorMessage: null,
          completedAt: new Date(),
        },
      });

      await tx.thread.update({
        where: { id: input.threadId },
        data: {
          answerPreview: input.answerPreview,
          status: ThreadStatus.COMPLETED,
        },
      });
    });
  }

  async failTurn(input: FailTurnInput): Promise<void> {
    await this.database.$transaction([
      this.database.turn.update({
        where: { id: input.turnId },
        data: {
          status: TurnStatus.FAILED,
          errorMessage: input.errorMessage,
          completedAt: new Date(),
        },
      }),
      this.database.thread.update({
        where: { id: input.threadId },
        data: {
          status: ThreadStatus.FAILED,
        },
      }),
    ]);
  }

  findThreadDetailById(threadId: string): Promise<ThreadDetailRecord | null> {
    return this.database.thread.findUnique({
      where: { id: threadId },
      include: threadDetailInclude,
    });
  }

  async findThreadWithSingleTurn(
    threadId: string,
    turnId: string,
  ): Promise<{
    thread: Omit<ThreadDetailRecord, 'turns'>;
    turn: TurnDetailRecord;
    totalSourceCount: number;
  } | null> {
    const [thread, turn, totalSourceCount] = await this.database.$transaction([
      this.database.thread.findUnique({
        where: { id: threadId },
        include: { _count: { select: { turns: true } } },
      }),
      this.database.turn.findUnique({
        where: { id: turnId },
        include: turnDetailInclude,
      }),
      this.database.source.count({
        where: { turn: { threadId } },
      }),
    ]);

    if (!thread || !turn) {
      return null;
    }

    return { thread, turn, totalSourceCount };
  }
}
