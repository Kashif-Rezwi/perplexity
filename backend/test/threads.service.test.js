const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NotFoundException } = require('@nestjs/common');
const { ThreadMode, ThreadStatus, TurnStatus } = require('@prisma/client');
const { mapThreadDetail } = require('../src/threads/mappers/thread-response.mapper.ts');
const { ThreadsService } = require('../src/threads/threads.service.ts');

const threadId = '11111111-1111-4111-8111-111111111111';
const turnId = '22222222-2222-4222-8222-222222222222';
const sourceId = '33333333-3333-4333-8333-333333333333';
const citationId = '44444444-4444-4444-8444-444444444444';
const createdAt = new Date('2026-06-04T00:00:00.000Z');
const updatedAt = new Date('2026-06-04T00:05:00.000Z');
const completedAt = new Date('2026-06-04T00:04:00.000Z');

function createThreadDetailRecord() {
  return {
    id: threadId,
    title: 'What changed in Next.js 15?',
    answerPreview: 'A concise preview',
    status: ThreadStatus.COMPLETED,
    mode: ThreadMode.WEB,
    createdAt,
    updatedAt,
    _count: { turns: 1 },
    turns: [
      {
        id: turnId,
        question: 'What changed in Next.js 15?',
        searchQuery: 'Next.js 15 changes',
        answerMarkdown: 'Next.js 15 changed several APIs. [1]',
        suggestedFollowUpQuestions: [
          'How does Next.js 15 affect app router projects?',
          'What should I migrate first in Next.js 15?',
          'Which Next.js 15 changes affect caching?',
        ],
        status: TurnStatus.COMPLETED,
        errorMessage: null,
        createdAt,
        completedAt,
        sources: [
          {
            id: sourceId,
            citationNumber: 1,
            title: 'Next.js 15 release notes',
            url: 'https://example.com/next-15',
            domain: 'example.com',
            snippet: 'Release notes snippet',
            provider: 'tavily',
            providerScore: 0.95,
            publishedAt: null,
            createdAt,
          },
        ],
        citations: [
          {
            id: citationId,
            sourceId,
            citationNumber: 1,
            createdAt,
          },
        ],
      },
    ],
  };
}

test('mapThreadDetail returns the thread detail API contract', () => {
  const detail = mapThreadDetail(createThreadDetailRecord());

  assert.equal(detail.threadId, threadId);
  assert.equal(detail.totalSourceCount, 1);
  assert.equal(detail.turnCount, 1);
  assert.equal(detail.turns[0].turnId, turnId);
  assert.deepEqual(detail.turns[0].suggestedFollowUpQuestions, [
    'How does Next.js 15 affect app router projects?',
    'What should I migrate first in Next.js 15?',
    'Which Next.js 15 changes affect caching?',
  ]);
  assert.equal(detail.turns[0].sources[0].sourceId, sourceId);
  assert.equal(detail.turns[0].citations[0].citationId, citationId);
});

test('ThreadsService returns thread detail through the repository', async () => {
  const service = new ThreadsService({
    async findThreadDetailById(id) {
      assert.equal(id, threadId);
      return createThreadDetailRecord();
    },
  });

  const response = await service.getThreadDetail(threadId);

  assert.equal(response.threadId, threadId);
  assert.equal(response.turns[0].turnId, turnId);
});

test('ThreadsService lists threads with defaults and nextCursor', async () => {
  const secondThreadId = '55555555-5555-4555-8555-555555555555';
  const service = new ThreadsService({
    async findThreads(options) {
      assert.deepEqual(options, {
        limit: 1,
        cursor: undefined,
        sort: 'newest',
        mode: 'all',
        q: undefined,
      });

      return [
        createThreadListRecord({ id: threadId, title: 'Newest thread' }),
        createThreadListRecord({ id: secondThreadId, title: 'Next page thread' }),
      ];
    },
  });

  const response = await service.listThreads({ limit: 1 });

  assert.equal(response.items.length, 1);
  assert.equal(response.items[0].threadId, threadId);
  assert.equal(response.items[0].title, 'Newest thread');
  assert.equal(response.items[0].totalSourceCount, 3);
  assert.equal(response.nextCursor, threadId);
});

test('ThreadsService passes list filters through to the repository', async () => {
  const service = new ThreadsService({
    async findThreads(options) {
      assert.deepEqual(options, {
        limit: 10,
        cursor: threadId,
        sort: 'oldest',
        mode: 'web',
        q: 'Next.js',
      });

      return [];
    },
  });

  const response = await service.listThreads({
    limit: 10,
    cursor: threadId,
    sort: 'oldest',
    mode: 'web',
    q: 'Next.js',
  });

  assert.deepEqual(response, { items: [], nextCursor: null });
});

test('ThreadsService returns an empty list for deep research mode', async () => {
  const service = new ThreadsService({
    async findThreads() {
      throw new Error('Repository should not be called for deep research mode');
    },
  });

  const response = await service.listThreads({ mode: 'deep-research' });

  assert.deepEqual(response, { items: [], nextCursor: null });
});

test('ThreadsService throws NotFoundException for missing threads', async () => {
  const service = new ThreadsService({
    async findThreadDetailById() {
      return null;
    },
  });

  await assert.rejects(
    () => service.getThreadDetail(threadId),
    (error) => error instanceof NotFoundException,
  );
});

function createThreadListRecord(overrides = {}) {
  return {
    id: overrides.id ?? threadId,
    title: overrides.title ?? 'What changed in Next.js 15?',
    answerPreview: 'A concise preview',
    status: ThreadStatus.COMPLETED,
    mode: ThreadMode.WEB,
    createdAt,
    updatedAt,
    _count: { turns: 2 },
    turns: [
      { _count: { sources: 1 } },
      { _count: { sources: 2 } },
    ],
  };
}
