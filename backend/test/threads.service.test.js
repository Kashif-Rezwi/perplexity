const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NotFoundException } = require('@nestjs/common');
const { ThreadMode, TurnStatus } = require('@prisma/client');
const { mapThreadDetail, mapThreadSummary } = require('../src/threads/mappers/thread-response.mapper.ts');
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
    mode: ThreadMode.WEB,
    isPinned: false,
    pinnedAt: null,
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
  assert.equal(detail.status, 'completed');
  assert.equal('answerPreview' in detail, false);
  assert.equal(detail.totalSourceCount, 1);
  assert.equal(detail.turnCount, 1);
  assert.equal(detail.turns[0].turnId, turnId);
  assert.equal(detail.turns[0].sourceCount, 1);
  assert.equal(detail.turns[0].citationCount, 1);
  assert.deepEqual(detail.turns[0].suggestedFollowUpQuestions, [
    'How does Next.js 15 affect app router projects?',
    'What should I migrate first in Next.js 15?',
    'Which Next.js 15 changes affect caching?',
  ]);
  assert.equal(detail.turns[0].sources[0].sourceId, sourceId);
  assert.equal(detail.turns[0].citations[0].citationId, citationId);
});

test('mapThreadDetail follows the latest attempt through pending, failure, and retry', () => {
  const record = createThreadDetailRecord();
  const latestTurn = {
    ...record.turns[0],
    id: '55555555-5555-4555-8555-555555555555',
    status: TurnStatus.PENDING,
    answerMarkdown: null,
    completedAt: null,
    sources: [],
    citations: [],
  };
  record.turns.push(latestTurn);
  record._count.turns = 2;

  const pending = mapThreadDetail(record);
  assert.equal(pending.status, 'running');
  assert.equal(pending.turns[0].status, 'completed');
  assert.equal(pending.turns[0].answerMarkdown, record.turns[0].answerMarkdown);

  latestTurn.status = TurnStatus.FAILED;
  latestTurn.errorMessage = 'Search failed';
  assert.equal(mapThreadDetail(record).status, 'failed');

  record.turns.push({
    ...latestTurn,
    id: '66666666-6666-4666-8666-666666666666',
    status: TurnStatus.COMPLETED,
    answerMarkdown: 'Retry succeeded.',
    errorMessage: null,
    completedAt,
  });
  record._count.turns = 3;

  const retried = mapThreadDetail(record);
  assert.equal(retried.status, 'completed');
  assert.deepEqual(retried.turns.map((turn) => turn.status), [
    'completed', 'failed', 'completed',
  ]);
});

for (const [turnStatus, expectedStatus] of [
  [TurnStatus.PENDING, 'running'],
  [TurnStatus.COMPLETED, 'completed'],
  [TurnStatus.FAILED, 'failed'],
]) {
  test(`mapThreadSummary derives ${expectedStatus} without exposing its status-only turn`, () => {
    const summary = mapThreadSummary(createThreadListRecord({ turnStatus }));

    assert.equal(summary.status, expectedStatus);
    assert.equal('turns' in summary, false);
    assert.equal(summary.turnCount, 2);
  });
}

test('thread responses keep the running fallback for a thread with no turns', () => {
  const detail = createThreadDetailRecord();
  detail.turns = [];
  detail._count.turns = 0;
  const summary = createThreadListRecord();
  summary.turns = [];
  summary._count.turns = 0;

  assert.equal(mapThreadDetail(detail).status, 'running');
  assert.equal(mapThreadSummary(summary).status, 'running');
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
        excludePinned: undefined,
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
  assert.equal('answerPreview' in response.items[0], false);
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
        excludePinned: undefined,
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

test('ThreadsService renames a thread and returns the summary contract', async () => {
  const service = new ThreadsService({
    async renameThread(input) {
      assert.deepEqual(input, {
        threadId,
        title: 'Renamed thread',
      });

      return createThreadListRecord({
        id: threadId,
        title: 'Renamed thread',
      });
    },
  });

  const response = await service.renameThread({
    threadId,
    title: 'Renamed thread',
  });

  assert.equal(response.threadId, threadId);
  assert.equal(response.title, 'Renamed thread');
  assert.equal(response.totalSourceCount, 3);
});

test('ThreadsService throws NotFoundException when renaming a missing thread', async () => {
  const service = new ThreadsService({
    async renameThread() {
      return null;
    },
  });

  await assert.rejects(
    () =>
      service.renameThread({
        threadId,
        title: 'Renamed thread',
      }),
    (error) => error instanceof NotFoundException,
  );
});

test('ThreadsService toggles pin and returns the summary contract', async () => {
  const service = new ThreadsService({
    async togglePin(input) {
      assert.deepEqual(input, {
        threadId,
        isPinned: true,
      });

      return createThreadListRecord({
        id: threadId,
        title: 'Pinned thread',
        isPinned: true,
        pinnedAt: new Date('2026-06-04T00:06:00.000Z'),
      });
    },
  });

  const response = await service.togglePin({
    threadId,
    isPinned: true,
  });

  assert.equal(response.threadId, threadId);
  assert.equal(response.isPinned, true);
  assert.equal(response.totalSourceCount, 3);
});

test('ThreadsService bounds pinned thread list limit', async () => {
  const service = new ThreadsService({
    async findPinnedThreads(limit) {
      assert.equal(limit, 50);
      return [];
    },
  });

  const response = await service.listPinnedThreads(500);

  assert.deepEqual(response, []);
});

test('ThreadsService de-dupes bulk delete ids before delegating', async () => {
  const service = new ThreadsService({
    async deleteThreads(ids) {
      assert.deepEqual(ids, [threadId]);
      return 1;
    },
  });

  const response = await service.deleteThreads([threadId, threadId]);

  assert.deepEqual(response, {
    requestedCount: 1,
    deletedCount: 1,
  });
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
    mode: ThreadMode.WEB,
    isPinned: overrides.isPinned ?? false,
    pinnedAt: overrides.pinnedAt ?? null,
    createdAt,
    updatedAt,
    _count: { turns: 2 },
    turns: [{ status: overrides.turnStatus ?? TurnStatus.COMPLETED }],
    totalSourceCount: 3,
  };
}
