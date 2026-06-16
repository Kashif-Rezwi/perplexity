import { Injectable } from '@nestjs/common';
import { Prisma, ThreadStatus, TurnStatus } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import type {
  AppendPendingTurnToThreadInput,
  CompleteTurnInput,
  CreateThreadWithPendingTurnInput,
  FailTurnInput,
} from '../types/threads.types';
import {
  threadDetailInclude,
  ThreadDetailRecord,
  ThreadWithSingleTurnRecord,
  turnDetailInclude,
} from '../types/threads.types';

type RepositoryTransaction = Prisma.TransactionClient;
type SourceIdsByCitationNumber = Map<number, string>;

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
      const sourceIdsByCitationNumber = await this.createTurnSources(
        tx,
        input.turnId,
        input.sources,
      );

      await this.createTurnCitations(
        tx,
        input.turnId,
        input.citationNumbers,
        sourceIdsByCitationNumber,
      );
      await this.completeTurnRecord(tx, input);
      await this.completeThreadRecord(
        tx,
        input.threadId,
        input.answerPreview,
      );
    });
  }

  async failTurn(input: FailTurnInput): Promise<void> {
    await this.database.$transaction(async (tx) => {
      await this.failTurnRecord(tx, input);
      await this.failThreadRecord(tx, input.threadId);
    });
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
  ): Promise<ThreadWithSingleTurnRecord | null> {
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

  private async createTurnSources(
    tx: RepositoryTransaction,
    turnId: string,
    sources: CompleteTurnInput['sources'],
  ): Promise<SourceIdsByCitationNumber> {
    const sourceIdsByCitationNumber = new Map<number, string>();

    for (const source of sources) {
      const createdSource = await tx.source.create({
        data: {
          ...source,
          turnId,
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

    return sourceIdsByCitationNumber;
  }

  private async createTurnCitations(
    tx: RepositoryTransaction,
    turnId: string,
    citationNumbers: CompleteTurnInput['citationNumbers'],
    sourceIdsByCitationNumber: SourceIdsByCitationNumber,
  ): Promise<void> {
    const citations = citationNumbers.flatMap((citationNumber) => {
      const sourceId = sourceIdsByCitationNumber.get(citationNumber);

      return sourceId
        ? [
          {
            turnId,
            sourceId,
            citationNumber,
          },
        ]
        : [];
    });

    if (citations.length > 0) {
      await tx.citation.createMany({ data: citations });
    }
  }

  private async completeTurnRecord(
    tx: RepositoryTransaction,
    input: CompleteTurnInput,
  ): Promise<void> {
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
  }

  private async completeThreadRecord(
    tx: RepositoryTransaction,
    threadId: string,
    answerPreview: string,
  ): Promise<void> {
    await tx.thread.update({
      where: { id: threadId },
      data: {
        answerPreview,
        status: ThreadStatus.COMPLETED,
      },
    });
  }

  private async failTurnRecord(
    tx: RepositoryTransaction,
    input: FailTurnInput,
  ): Promise<void> {
    await tx.turn.update({
      where: { id: input.turnId },
      data: {
        status: TurnStatus.FAILED,
        errorMessage: input.errorMessage,
        completedAt: new Date(),
      },
    });
  }

  private async failThreadRecord(
    tx: RepositoryTransaction,
    threadId: string,
  ): Promise<void> {
    await tx.thread.update({
      where: { id: threadId },
      data: {
        status: ThreadStatus.FAILED,
      },
    });
  }
}
