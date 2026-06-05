const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NotFoundException } = require('@nestjs/common');
const { ThreadMode, ThreadStatus, TurnStatus } = require('@prisma/client');
const { mapThreadDetail } = require('../dist/src/threads/mappers/thread-response.mapper.js');
const { ThreadsService } = require('../dist/src/threads/threads.service.js');

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
  assert.equal(detail.sourceCount, 1);
  assert.equal(detail.turnCount, 1);
  assert.equal(detail.turns[0].turnId, turnId);
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
