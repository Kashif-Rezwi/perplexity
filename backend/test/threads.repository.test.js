const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NotFoundException } = require('@nestjs/common');
const { ThreadMode, ThreadStatus, TurnStatus } = require('@prisma/client');
const {
  ThreadsRepository,
} = require('../src/threads/repositories/threads.repository.ts');

const threadId = '11111111-1111-4111-8111-111111111111';
const turnId = '22222222-2222-4222-8222-222222222222';

test('ThreadsRepository.appendPendingTurnToThread marks thread running and creates a turn', async () => {
  const repository = new ThreadsRepository({
    thread: {
      async update(args) {
        return args;
      },
    },
  });

  const response = await repository.appendPendingTurnToThread({
    threadId,
    question: 'What about pricing?',
    searchQuery: 'What about pricing?',
  });

  assert.deepEqual(response, {
    where: { id: threadId },
    data: {
      status: ThreadStatus.RUNNING,
      turns: {
        create: {
          question: 'What about pricing?',
          searchQuery: 'What about pricing?',
          status: TurnStatus.PENDING,
        },
      },
    },
    include: response.include,
  });
  assert(response.include.turns);
});

test('ThreadsRepository.completeTurn persists sources and matching citations', async () => {
  const operations = [];
  const repository = new ThreadsRepository({
    async $transaction(callback) {
      return callback({
        source: {
          async create(args) {
            operations.push(['source.create', args]);
            return {
              id: `source-${args.data.citationNumber}`,
              citationNumber: args.data.citationNumber,
            };
          },
        },
        citation: {
          async createMany(args) {
            operations.push(['citation.createMany', args]);
          },
        },
        turn: {
          async findFirst(args) {
            operations.push(['turn.findFirst', args]);
            return { id: turnId };
          },
          async update(args) {
            operations.push(['turn.update', args]);
          },
        },
        thread: {
          async update(args) {
            operations.push(['thread.update', args]);
          },
        },
      });
    },
  });

  await repository.completeTurn({
    threadId,
    turnId,
    answerMarkdown: 'Answer [2] then [1].',
    answerPreview: 'Answer [2] then [1].',
    sources: [
      {
        citationNumber: 1,
        title: 'Source one',
        url: 'https://example.com/one',
        domain: 'example.com',
        snippet: 'Snippet one',
        provider: 'tavily',
        providerScore: 0.9,
        publishedAt: null,
      },
      {
        citationNumber: 2,
        title: 'Source two',
        url: 'https://example.com/two',
        domain: 'example.com',
        snippet: 'Snippet two',
        provider: 'tavily',
        providerScore: 0.8,
        publishedAt: null,
      },
    ],
    citationNumbers: [2, 1, 99],
    suggestedFollowUpQuestions: [
      'How do Prisma relation fields work?',
      'How do I create related records in Prisma?',
      'How do Prisma foreign keys map to database columns?',
    ],
  });

  assert.deepEqual(operations[0], [
    'turn.findFirst',
    {
      where: { id: turnId, threadId },
      select: { id: true },
    },
  ]);
  assert.equal(operations[1][0], 'source.create');
  assert.equal(operations[2][0], 'source.create');
  assert.deepEqual(operations[3], [
    'citation.createMany',
    {
      data: [
        { turnId, sourceId: 'source-2', citationNumber: 2 },
        { turnId, sourceId: 'source-1', citationNumber: 1 },
      ],
    },
  ]);
  assert.deepEqual(operations[4], [
    'turn.update',
    {
      where: { id: turnId },
      data: {
        answerMarkdown: 'Answer [2] then [1].',
        suggestedFollowUpQuestions: [
          'How do Prisma relation fields work?',
          'How do I create related records in Prisma?',
          'How do Prisma foreign keys map to database columns?',
        ],
        status: TurnStatus.COMPLETED,
        errorMessage: null,
        completedAt: operations[4][1].data.completedAt,
      },
    },
  ]);
  assert(operations[4][1].data.completedAt instanceof Date);
  assert.deepEqual(operations[5], [
    'thread.update',
    {
      where: { id: threadId },
      data: {
        answerPreview: 'Answer [2] then [1].',
        status: ThreadStatus.COMPLETED,
      },
    },
  ]);
});

test('ThreadsRepository.completeTurn rejects mismatched thread and turn ids before writing', async () => {
  const operations = [];
  const repository = new ThreadsRepository({
    async $transaction(callback) {
      return callback({
        turn: {
          async findFirst(args) {
            operations.push(['turn.findFirst', args]);
            return null;
          },
        },
        source: {
          async create(args) {
            operations.push(['source.create', args]);
          },
        },
      });
    },
  });

  await assert.rejects(
    () =>
      repository.completeTurn({
        threadId,
        turnId,
        answerMarkdown: 'Answer',
        answerPreview: 'Answer',
        sources: [],
        citationNumbers: [],
        suggestedFollowUpQuestions: [],
      }),
    (error) =>
      error instanceof NotFoundException &&
      error.message === `Turn ${turnId} was not found in thread ${threadId}`,
  );

  assert.deepEqual(operations, [
    [
      'turn.findFirst',
      {
        where: { id: turnId, threadId },
        select: { id: true },
      },
    ],
  ]);
});

test('ThreadsRepository.findThreads builds stable filtered pagination query', async () => {
  let findManyArgs;
  const repository = new ThreadsRepository({
    thread: {
      async findMany(args) {
        findManyArgs = args;
        return [];
      },
    },
  });

  const response = await repository.findThreads({
    limit: 10,
    cursor: threadId,
    sort: 'oldest',
    mode: 'web',
    q: 'Next.js',
  });

  assert.deepEqual(findManyArgs, {
    take: 11,
    skip: 1,
    cursor: { id: threadId },
    where: {
      mode: ThreadMode.WEB,
      title: {
        contains: 'Next.js',
        mode: 'insensitive',
      },
    },
    orderBy: [
      { updatedAt: 'asc' },
      { id: 'asc' },
    ],
    include: findManyArgs.include,
  });
  assert(findManyArgs.include._count);
  assert.deepEqual(response, []);
});

test('ThreadsRepository.findThreads defaults to newest ordering without optional filters', async () => {
  let findManyArgs;
  const repository = new ThreadsRepository({
    thread: {
      async findMany(args) {
        findManyArgs = args;
        return [];
      },
    },
  });

  const response = await repository.findThreads({
    limit: 20,
    sort: 'newest',
    mode: 'all',
  });

  assert.deepEqual(findManyArgs, {
    take: 21,
    skip: undefined,
    cursor: undefined,
    where: {},
    orderBy: [
      { updatedAt: 'desc' },
      { id: 'desc' },
    ],
    include: findManyArgs.include,
  });
  assert.deepEqual(response, []);
});

test('ThreadsRepository.renameThread updates title without a normal Prisma update', async () => {
  const calls = [];
  const previousUpdatedAt = new Date('2026-06-04T00:05:00.000Z');
  const repository = new ThreadsRepository({
    async $transaction(callback) {
      return callback({
        async $queryRaw(strings, ...values) {
          const query = String.raw(strings);
          calls.push(['queryRaw', query, ...values]);

          if (query.includes('UPDATE "Thread"')) {
            return [{ id: threadId }];
          }

          return [{ threadId, totalSourceCount: 3 }];
        },
        thread: {
          async findUnique(args) {
            calls.push(['thread.findUnique', args]);
            return {
              id: threadId,
              title: 'Renamed thread',
              answerPreview: 'Preview',
              status: ThreadStatus.COMPLETED,
              mode: ThreadMode.WEB,
              createdAt: new Date('2026-06-04T00:00:00.000Z'),
              updatedAt: previousUpdatedAt,
              _count: { turns: 1 },
            };
          },
        },
      });
    },
  });

  const response = await repository.renameThread({
    threadId,
    title: 'Renamed thread',
  });

  assert.equal(response.title, 'Renamed thread');
  assert.equal(response.updatedAt, previousUpdatedAt);
  assert.equal(response.totalSourceCount, 3);
  assert.equal(calls[0][0], 'queryRaw');
  assert.match(calls[0][1], /UPDATE "Thread"/);
  assert.match(calls[0][1], /SET "title"/);
  assert.equal(calls[0][2], 'Renamed thread');
  assert.equal(calls[0][3], threadId);
  assert.deepEqual(calls[1], [
    'thread.findUnique',
    {
      where: { id: threadId },
      include: calls[1][1].include,
    },
  ]);
  assert.equal(calls[2][0], 'queryRaw');
  assert.match(calls[2][1], /COUNT\("Source"\."id"\)/);
});

test('ThreadsRepository.renameThread returns null for missing threads', async () => {
  const repository = new ThreadsRepository({
    async $transaction(callback) {
      return callback({
        async $queryRaw() {
          return [];
        },
      });
    },
  });

  const response = await repository.renameThread({
    threadId,
    title: 'Missing thread',
  });

  assert.equal(response, null);
});

test('ThreadsRepository.deleteThreads uses deleteMany and returns count', async () => {
  const repository = new ThreadsRepository({
    thread: {
      async deleteMany(args) {
        assert.deepEqual(args, {
          where: { id: { in: [threadId] } },
        });
        return { count: 1 };
      },
    },
  });

  const response = await repository.deleteThreads([threadId]);

  assert.equal(response, 1);
});

test('ThreadsRepository.deleteThread uses idempotent deleteMany', async () => {
  const repository = new ThreadsRepository({
    thread: {
      async deleteMany(args) {
        assert.deepEqual(args, {
          where: { id: threadId },
        });
        return { count: 0 };
      },
    },
  });

  await repository.deleteThread(threadId);
});

test('ThreadsRepository.togglePin preserves updatedAt and returns a summary record', async () => {
  const calls = [];
  const previousUpdatedAt = new Date('2026-06-04T00:05:00.000Z');
  const repository = new ThreadsRepository({
    async $transaction(callback) {
      return callback({
        async $queryRaw(strings, ...values) {
          const query = String.raw(strings);
          calls.push(['queryRaw', query, ...values]);

          if (query.includes('UPDATE "Thread"')) {
            return [{ id: threadId }];
          }

          return [{ threadId, totalSourceCount: 2 }];
        },
        thread: {
          async findUnique(args) {
            calls.push(['thread.findUnique', args]);
            return {
              id: threadId,
              title: 'Pinned thread',
              answerPreview: 'Preview',
              status: ThreadStatus.COMPLETED,
              mode: ThreadMode.WEB,
              isPinned: true,
              pinnedAt: new Date('2026-06-04T00:06:00.000Z'),
              createdAt: new Date('2026-06-04T00:00:00.000Z'),
              updatedAt: previousUpdatedAt,
              _count: { turns: 1 },
            };
          },
        },
      });
    },
  });

  const response = await repository.togglePin({
    threadId,
    isPinned: true,
  });

  assert.equal(response.isPinned, true);
  assert.equal(response.updatedAt, previousUpdatedAt);
  assert.equal(response.totalSourceCount, 2);
  assert.match(calls[0][1], /UPDATE "Thread"/);
  assert.doesNotMatch(calls[0][1], /"updatedAt"/);
});

test('ThreadsRepository.findPinnedThreads uses limit and pinned ordering', async () => {
  let findManyArgs;
  const repository = new ThreadsRepository({
    thread: {
      async findMany(args) {
        findManyArgs = args;
        return [];
      },
    },
  });

  const response = await repository.findPinnedThreads(20);

  assert.deepEqual(findManyArgs, {
    where: { isPinned: true },
    take: 20,
    orderBy: [{ pinnedAt: 'desc' }, { id: 'desc' }],
    include: findManyArgs.include,
  });
  assert.deepEqual(response, []);
});
