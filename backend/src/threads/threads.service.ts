import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ApiThreadStatus = 'running' | 'completed' | 'failed';
type ApiThreadMode = 'web';

type ListRecentsOptions = {
  limit?: number;
};

type RecentThreadItem = {
  threadId: string;
  title: string;
  link: string;
  status: ApiThreadStatus;
  mode: ApiThreadMode;
  answerPreview: string | null;
  sourceCount: number;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
};

type ListRecentsResponse = {
  items: RecentThreadItem[];
  nextCursor: null;
};

@Injectable()
export class ThreadsService {
  constructor(private readonly prisma: PrismaService) {}

  async listRecents(options: ListRecentsOptions = {}): Promise<ListRecentsResponse> {
    const limit = options.limit ?? 20;

    const threads = await this.prisma.thread.findMany({
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { turns: true },
        },
        turns: {
          select: {
            _count: {
              select: { sources: true },
            },
          },
        },
      },
    });

    return {
      items: threads.map((thread) => ({
        threadId: thread.id,
        title: thread.title,
        link: `/search/${thread.id}`,
        status: mapThreadStatus(thread.status),
        mode: mapThreadMode(thread.mode),
        answerPreview: thread.answerPreview,
        sourceCount: thread.turns.reduce(
          (sourceCount, turn) => sourceCount + turn._count.sources,
          0,
        ),
        turnCount: thread._count.turns,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
      })),
      nextCursor: null,
    };
  }
}

function mapThreadStatus(status: string): ApiThreadStatus {
  switch (status) {
    case 'RUNNING':
      return 'running';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    default:
      return 'failed';
  }
}

function mapThreadMode(mode: string): ApiThreadMode {
  switch (mode) {
    case 'WEB':
      return 'web';
    default:
      return 'web';
  }
}
