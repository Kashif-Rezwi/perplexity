import { Injectable } from '@nestjs/common';
import { ThreadStatus, TurnStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) { }

  createThreadWithPendingTurn(
    input: CreateThreadWithPendingTurnInput,
  ): Promise<ThreadDetailRecord> {
    return this.prisma.thread.create({
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
    return this.prisma.thread.update({
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
    await this.prisma.$transaction(async (tx) => {
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
    await this.prisma.$transaction([
      this.prisma.turn.update({
        where: { id: input.turnId },
        data: {
          status: TurnStatus.FAILED,
          errorMessage: input.errorMessage,
          completedAt: new Date(),
        },
      }),
      this.prisma.thread.update({
        where: { id: input.threadId },
        data: {
          status: ThreadStatus.FAILED,
        },
      }),
    ]);
  }

  findThreadDetailById(threadId: string): Promise<ThreadDetailRecord | null> {
    return this.prisma.thread.findUnique({
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
    const [thread, turn, totalSourceCount] = await this.prisma.$transaction([
      this.prisma.thread.findUnique({
        where: { id: threadId },
        include: { _count: { select: { turns: true } } },
      }),
      this.prisma.turn.findUnique({
        where: { id: turnId },
        include: turnDetailInclude,
      }),
      this.prisma.source.count({
        where: { turn: { threadId } },
      }),
    ]);

    if (!thread || !turn) {
      return null;
    }

    return { thread, turn, totalSourceCount };
  }
}
