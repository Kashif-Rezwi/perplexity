const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mapRecentSource } = require('../dist/src/sources/mappers/source-response.mapper.js');
const { SourcesService } = require('../dist/src/sources/sources.service.js');

const sourceId = '33333333-3333-4333-8333-333333333333';
const turnId = '22222222-2222-4222-8222-222222222222';
const threadId = '11111111-1111-4111-8111-111111111111';
const createdAt = new Date('2026-06-04T00:00:00.000Z');

function createRecentSourceRecord() {
  return {
    id: sourceId,
    turnId,
    citationNumber: 1,
    title: 'Next.js 15 release notes',
    url: 'https://example.com/next-15',
    domain: 'example.com',
    snippet: 'Release notes snippet',
    provider: 'tavily',
    providerScore: 0.95,
    publishedAt: null,
    createdAt,
    turn: {
      id: turnId,
      question: 'What changed in Next.js 15?',
      thread: {
        id: threadId,
        title: 'What changed in Next.js 15?',
      },
    },
  };
}

test('mapRecentSource returns the recent sources API contract', () => {
  assert.deepEqual(mapRecentSource(createRecentSourceRecord()), {
    sourceId,
    turnId,
    threadId,
    threadTitle: 'What changed in Next.js 15?',
    question: 'What changed in Next.js 15?',
    link: `/search/${threadId}`,
    citationNumber: 1,
    title: 'Next.js 15 release notes',
    url: 'https://example.com/next-15',
    domain: 'example.com',
    snippet: 'Release notes snippet',
    provider: 'tavily',
    providerScore: 0.95,
    publishedAt: null,
    createdAt: createdAt.toISOString(),
  });
});

test('SourcesService lists recent sources through the repository', async () => {
  let receivedLimit;
  const service = new SourcesService({
    async findRecentSources(limit) {
      receivedLimit = limit;
      return [createRecentSourceRecord()];
    },
  });

  const response = await service.listRecentSources({ limit: 7 });

  assert.equal(receivedLimit, 7);
  assert.equal(response.items.length, 1);
  assert.equal(response.items[0].sourceId, sourceId);
  assert.equal(response.nextCursor, null);
});
