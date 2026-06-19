const assert = require('node:assert/strict');
const { test } = require('node:test');
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

  assert.equal(operations[0][0], 'source.create');
  assert.equal(operations[1][0], 'source.create');
  assert.deepEqual(operations[2], [
    'citation.createMany',
    {
      data: [
        { turnId, sourceId: 'source-2', citationNumber: 2 },
        { turnId, sourceId: 'source-1', citationNumber: 1 },
      ],
    },
  ]);
  assert.deepEqual(operations[3], [
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
        completedAt: operations[3][1].data.completedAt,
      },
    },
  ]);
  assert(operations[3][1].data.completedAt instanceof Date);
  assert.deepEqual(operations[4], [
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

test('ThreadsRepository.findThreads builds stable filtered pagination query', async () => {
  const repository = new ThreadsRepository({
    thread: {
      async findMany(args) {
        return args;
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

  assert.deepEqual(response, {
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
    include: response.include,
  });
  assert(response.include._count);
  assert(response.include.turns);
});

test('ThreadsRepository.findThreads defaults to newest ordering without optional filters', async () => {
  const repository = new ThreadsRepository({
    thread: {
      async findMany(args) {
        return args;
      },
    },
  });

  const response = await repository.findThreads({
    limit: 20,
    sort: 'newest',
    mode: 'all',
  });

  assert.deepEqual(response, {
    take: 21,
    skip: undefined,
    cursor: undefined,
    where: {},
    orderBy: [
      { updatedAt: 'desc' },
      { id: 'desc' },
    ],
    include: response.include,
  });
});
