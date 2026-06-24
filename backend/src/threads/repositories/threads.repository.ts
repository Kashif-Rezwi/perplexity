import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ThreadMode, ThreadStatus, TurnStatus } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import type {
  AppendPendingTurnToThreadInput,
  CompleteTurnInput,
  CreateThreadWithPendingTurnInput,
  FailTurnInput,
  ListThreadsOptions,
  RenameThreadInput,
  TogglePinInput,
} from '../types/threads.types';
import {
  threadDetailInclude,
  ThreadDetailRecord,
  ThreadListBaseRecord,
  threadListInclude,
  ThreadListRecord,
  ThreadWithSingleTurnRecord,
  turnDetailInclude,
} from '../types/threads.types';

type RepositoryTransaction = Prisma.TransactionClient;
type SourceIdsByCitationNumber = Map<number, string>;
type FindThreadsOptions = ListThreadsOptions & {
  limit: number;
  sort: NonNullable<ListThreadsOptions['sort']>;
  mode: NonNullable<ListThreadsOptions['mode']>;
};

@Injectable()
export class ThreadsRepository {
  constructor(private readonly database: DatabaseService) {}

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
      await this.ensureTurnBelongsToThread(tx, input.threadId, input.turnId);

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
      await this.ensureTurnBelongsToThread(tx, input.threadId, input.turnId);
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

  async findThreads(options: FindThreadsOptions): Promise<ThreadListRecord[]> {
    const where: Prisma.ThreadWhereInput = {};

    if (options.mode === 'web') {
      where.mode = ThreadMode.WEB;
    }

    if (options.q) {
      where.title = {
        contains: options.q,
        mode: 'insensitive',
      };
    }

    if (options.excludePinned) {
      where.isPinned = false;
    }

    const orderDirection = options.sort === 'oldest' ? 'asc' : 'desc';

    const threads = await this.database.thread.findMany({
      take: options.limit + 1,
      skip: options.cursor ? 1 : undefined,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      where,
      orderBy: [
        { updatedAt: orderDirection },
        { id: orderDirection },
      ],
      include: threadListInclude,
    });

    return this.attachTotalSourceCounts(threads);
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.database.thread.deleteMany({
      where: { id: threadId },
    });
  }

  async deleteThreads(threadIds: string[]): Promise<number> {
    if (threadIds.length === 0) {
      return 0;
    }

    const result = await this.database.thread.deleteMany({
      where: { id: { in: threadIds } },
    });

    return result.count;
  }

  async renameThread(
    input: RenameThreadInput,
  ): Promise<ThreadListRecord | null> {
    return this.database.$transaction(async (tx) => {
      const updated = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE "Thread"
        SET "title" = ${input.title}
        WHERE "id" = CAST(${input.threadId} AS uuid)
        RETURNING "id"
      `;

      if (updated.length === 0) {
        return null;
      }

      const thread = await tx.thread.findUnique({
        where: { id: input.threadId },
        include: threadListInclude,
      });

      return thread ? this.attachTotalSourceCount(tx, thread) : null;
    });
  }

  async togglePin(
    input: TogglePinInput,
  ): Promise<ThreadListRecord | null> {
    return this.database.$transaction(async (tx) => {
      const updated = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE "Thread"
        SET
          "isPinned" = ${input.isPinned},
          "pinnedAt" = ${input.isPinned ? new Date() : null}
        WHERE "id" = CAST(${input.threadId} AS uuid)
        RETURNING "id"
      `;

      if (updated.length === 0) {
        return null;
      }

      const thread = await tx.thread.findUnique({
        where: { id: input.threadId },
        include: threadListInclude,
      });

      return thread ? this.attachTotalSourceCount(tx, thread) : null;
    });
  }

  async findPinnedThreads(limit: number): Promise<ThreadListRecord[]> {
    const threads = await this.database.thread.findMany({
      where: { isPinned: true },
      take: limit,
      orderBy: [{ pinnedAt: 'desc' }, { id: 'desc' }],
      include: threadListInclude,
    });

    return this.attachTotalSourceCounts(threads);
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
      this.database.turn.findFirst({
        where: { id: turnId, threadId },
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

  private async ensureTurnBelongsToThread(
    tx: RepositoryTransaction,
    threadId: string,
    turnId: string,
  ): Promise<void> {
    const turn = await tx.turn.findFirst({
      where: { id: turnId, threadId },
      select: { id: true },
    });

    if (!turn) {
      throw new NotFoundException(
        `Turn ${turnId} was not found in thread ${threadId}`,
      );
    }
  }

  private async attachTotalSourceCount(
    tx: RepositoryTransaction,
    thread: ThreadListBaseRecord,
  ): Promise<ThreadListRecord> {
    const [threadWithCount] = await this.attachTotalSourceCounts([thread], tx);
    return threadWithCount;
  }

  private async attachTotalSourceCounts(
    threads: ThreadListBaseRecord[],
    tx: RepositoryTransaction | DatabaseService = this.database,
  ): Promise<ThreadListRecord[]> {
    if (threads.length === 0) {
      return [];
    }

    const threadIds = threads.map((thread) => thread.id);
    const sourceCounts = await this.countSourcesByThreadId(tx, threadIds);

    return threads.map((thread) => ({
      ...thread,
      totalSourceCount: sourceCounts.get(thread.id) ?? 0,
    }));
  }

  private async countSourcesByThreadId(
    tx: RepositoryTransaction | DatabaseService,
    threadIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await tx.$queryRaw<
      Array<{ threadId: string; totalSourceCount: number }>
    >`
      SELECT
        "Turn"."threadId"::text AS "threadId",
        COUNT("Source"."id")::int AS "totalSourceCount"
      FROM "Turn"
      LEFT JOIN "Source" ON "Source"."turnId" = "Turn"."id"
      WHERE "Turn"."threadId" IN (${Prisma.join(
        threadIds.map((threadId) => Prisma.sql`CAST(${threadId} AS uuid)`),
      )})
      GROUP BY "Turn"."threadId"
    `;

    return new Map(
      rows.map((row) => [row.threadId, Number(row.totalSourceCount)]),
    );
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
