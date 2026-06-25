import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/api/queryKeys';
import type {
  AskResponse,
  AskStreamErrorEvent,
  AskStreamStartEvent,
  ThreadDetailResponse,
} from '@/types/api.types';
import type { ThreadHistoryItem } from '@/store/historyStore';
import {
  appendStreamingTurnToThread,
  applyFinalAskResponse,
  createStreamingThread,
  hasPersistedTurn,
  markStreamingTurnFailed,
} from './askCache';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function startEvent(
  turnId: string,
  question = 'What is Prisma?',
): AskStreamStartEvent {
  return {
    threadId: 'thread-1',
    turnId,
    question,
    searchQuery: question,
  };
}

function askResponse(turnId = 'turn-1'): AskResponse {
  return {
    thread: {
      threadId: 'thread-1',
      title: 'What is Prisma?',
      status: 'completed',
      mode: 'web',
      answerPreview: 'Prisma is an ORM.',
      isPinned: false,
      pinnedAt: null,
      totalSourceCount: 1,
      turnCount: 1,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    },
    turn: {
      turnId,
      question: 'What is Prisma?',
      searchQuery: 'What is Prisma?',
      answerMarkdown: 'Prisma is an ORM. [1]',
      suggestedFollowUpQuestions: ['How do Prisma relations work?'],
      status: 'completed',
      errorMessage: null,
      sourceCount: 1,
      citationCount: 1,
      citations: [
        {
          citationId: 'citation-1',
          citationNumber: 1,
          sourceId: 'source-1',
          title: 'Prisma docs',
          domain: 'prisma.io',
          url: 'https://www.prisma.io/docs',
          snippet: 'Prisma documentation',
          publishedAt: null,
        },
      ],
      createdAt: '2026-06-01T00:00:00.000Z',
      completedAt: '2026-06-01T00:00:00.000Z',
    },
  };
}

describe('ask cache helpers', () => {
  it('applies the final ask response and registers the history item', () => {
    const queryClient = createQueryClient();
    const addedThreads: ThreadHistoryItem[] = [];

    applyFinalAskResponse(queryClient, (thread) => addedThreads.push(thread), askResponse());

    const cachedThread = queryClient.getQueryData<ThreadDetailResponse>(
      queryKeys.thread('thread-1'),
    );

    expect(addedThreads).toEqual([
      {
        id: 'thread-1',
        title: 'What is Prisma?',
        mode: 'web',
        updatedAt: '2026-06-01T00:00:00.000Z',
        isPinned: false,
      },
    ]);
    expect(cachedThread?.turns).toHaveLength(1);
    expect(cachedThread?.turns[0]).toMatchObject({
      turnId: 'turn-1',
      status: 'completed',
      answerMarkdown: 'Prisma is an ORM. [1]',
      sources: [
        {
          sourceId: 'source-1',
          citationNumber: 1,
          title: 'Prisma docs',
        },
      ],
      citationSources: [
        {
          sourceId: 'source-1',
          citationNumber: 1,
          title: 'Prisma docs',
        },
      ],
    });
  });

  it('appends a streaming turn once and increments the cached turn count', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      queryKeys.thread('thread-1'),
      createStreamingThread(startEvent('turn-1')),
    );

    appendStreamingTurnToThread(
      queryClient,
      'thread-1',
      startEvent('turn-2', 'What about relations?'),
    );
    appendStreamingTurnToThread(
      queryClient,
      'thread-1',
      startEvent('turn-2', 'What about relations?'),
    );

    const cachedThread = queryClient.getQueryData<ThreadDetailResponse>(
      queryKeys.thread('thread-1'),
    );

    expect(cachedThread?.turnCount).toBe(2);
    expect(cachedThread?.turns.map((turn) => turn.turnId)).toEqual([
      'turn-1',
      'turn-2',
    ]);
  });

  it('marks a streaming turn failed and detects persisted turns', () => {
    const queryClient = createQueryClient();
    const streamError: AskStreamErrorEvent = {
      message: 'Streaming failed',
      code: 'ANSWER_FAILED',
      retryable: true,
    };

    queryClient.setQueryData(
      queryKeys.thread('thread-1'),
      createStreamingThread(startEvent('turn-1')),
    );

    let cachedThread = queryClient.getQueryData<ThreadDetailResponse>(
      queryKeys.thread('thread-1'),
    );
    expect(hasPersistedTurn(cachedThread, 'turn-1')).toBe(false);

    markStreamingTurnFailed(queryClient, 'thread-1', 'turn-1', streamError);

    cachedThread = queryClient.getQueryData<ThreadDetailResponse>(
      queryKeys.thread('thread-1'),
    );

    expect(cachedThread?.status).toBe('failed');
    expect(cachedThread?.turns[0]).toMatchObject({
      status: 'failed',
      errorMessage: 'Streaming failed',
      streamStage: null,
      streamMessage: null,
    });
    expect(hasPersistedTurn(cachedThread, 'turn-1')).toBe(true);
    expect(hasPersistedTurn(cachedThread, 'missing-turn')).toBe(false);
  });
});
