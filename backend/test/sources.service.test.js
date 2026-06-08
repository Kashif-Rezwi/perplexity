const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  mapSearchResultsToSourceInputs,
} = require('../src/ask/mappers/search-to-source.mapper.ts');
const { mapSource } = require('../src/sources/mappers/source-response.mapper.ts');
const { SourcesService } = require('../src/sources/sources.service.ts');

const sourceId = '33333333-3333-4333-8333-333333333333';
const turnId = '22222222-2222-4222-8222-222222222222';
const threadId = '11111111-1111-4111-8111-111111111111';
const createdAt = new Date('2026-06-04T00:00:00.000Z');

function createSourceRecord() {
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

test('mapSource returns the recent sources API contract', () => {
  assert.deepEqual(mapSource(createSourceRecord()), {
    sourceId,
    turnId,
    threadId,
    threadTitle: 'What changed in Next.js 15?',
    question: 'What changed in Next.js 15?',
    citationNumber: 1,
    title: 'Next.js 15 release notes',
    url: 'https://example.com/next-15',
    domain: 'example.com',
    snippet: 'Release notes snippet',
    publishedAt: null,
    createdAt: createdAt.toISOString(),
  });
});

test('SourcesService lists recent sources through the repository', async () => {
  let receivedOptions;
  const service = new SourcesService({
    async findSources(options) {
      receivedOptions = options;
      return [createSourceRecord()];
    },
  });

  const response = await service.listSources({ limit: 7, turnId });

  assert.deepEqual(receivedOptions, { limit: 7, turnId });
  assert.equal(response.items.length, 1);
  assert.equal(response.items[0].sourceId, sourceId);
  assert.equal(response.nextCursor, null);
});

test('mapSearchResultsToSourceInputs maps ordered unique source inputs', () => {
  const publishedAt = '2026-06-03T00:00:00.000Z';

  assert.deepEqual(
    mapSearchResultsToSourceInputs([
      {
        title: ' First source ',
        url: 'https://www.example.com/first',
        content: ' First snippet ',
        score: 0.9,
        publishedAt,
      },
      {
        title: 'Duplicate source',
        url: 'https://www.example.com/first',
        content: 'Duplicate snippet',
        score: 0.8,
        publishedAt: null,
      },
      {
        title: '',
        url: 'not-a-url',
        content: 'Second snippet',
        score: null,
        publishedAt: 'not-a-date',
      },
    ]),
    [
      {
        citationNumber: 1,
        title: 'First source',
        url: 'https://www.example.com/first',
        domain: 'example.com',
        snippet: 'First snippet',
        provider: 'tavily',
        providerScore: 0.9,
        publishedAt: new Date(publishedAt),
      },
      {
        citationNumber: 2,
        title: 'not-a-url',
        url: 'not-a-url',
        domain: 'unknown',
        snippet: 'Second snippet',
        provider: 'tavily',
        providerScore: null,
        publishedAt: null,
      },
    ],
  );
});
