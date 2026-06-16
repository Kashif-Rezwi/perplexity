const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  mapSearchResultsToSourceInputs,
} = require('../src/ask/mappers/search-to-source.mapper.ts');
const { mapSource } = require('../src/sources/mappers/source-response.mapper.ts');

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

test('mapSource returns the correct API contract shape', () => {
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

test('mapSearchResultsToSourceInputs skips entries with empty URL', () => {
  const results = mapSearchResultsToSourceInputs([
    { title: 'No URL', url: '', content: 'snippet', score: 0.5, publishedAt: null },
    { title: 'Whitespace URL', url: '   ', content: 'snippet', score: 0.5, publishedAt: null },
    { title: 'Valid', url: 'https://example.com', content: 'snippet', score: 0.5, publishedAt: null },
  ]);

  assert.equal(results.length, 1);
  assert.equal(results[0].url, 'https://example.com');
  assert.equal(results[0].citationNumber, 1);
});

test('mapSearchResultsToSourceInputs deduplicates by URL — first occurrence wins', () => {
  const results = mapSearchResultsToSourceInputs([
    { title: 'First', url: 'https://example.com/page', content: 'first', score: 0.9, publishedAt: null },
    { title: 'Second', url: 'https://example.com/page', content: 'second', score: 0.8, publishedAt: null },
    { title: 'Third', url: 'https://example.com/page', content: 'third', score: 0.7, publishedAt: null },
  ]);

  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'First');
  assert.equal(results[0].snippet, 'first');
});

test('mapSearchResultsToSourceInputs assigns sequential citationNumbers after deduplication', () => {
  const results = mapSearchResultsToSourceInputs([
    { title: 'A', url: 'https://a.com', content: 'a', score: 1, publishedAt: null },
    { title: 'Dup A', url: 'https://a.com', content: 'dup', score: 0.9, publishedAt: null },
    { title: 'B', url: 'https://b.com', content: 'b', score: 0.8, publishedAt: null },
    { title: 'C', url: 'https://c.com', content: 'c', score: 0.7, publishedAt: null },
  ]);

  assert.equal(results.length, 3);
  assert.equal(results[0].citationNumber, 1);
  assert.equal(results[1].citationNumber, 2);
  assert.equal(results[2].citationNumber, 3);
});

test('mapSearchResultsToSourceInputs strips www from domain', () => {
  const results = mapSearchResultsToSourceInputs([
    { title: 'WWW', url: 'https://www.example.com/page', content: 'snip', score: 0.5, publishedAt: null },
  ]);

  assert.equal(results[0].domain, 'example.com');
});

test('mapSearchResultsToSourceInputs returns unknown domain for invalid URL', () => {
  const results = mapSearchResultsToSourceInputs([
    { title: 'Invalid URL', url: 'not-a-url', content: 'snip', score: 0.5, publishedAt: null },
  ]);

  assert.equal(results[0].domain, 'unknown');
});

test('mapSearchResultsToSourceInputs returns null publishedAt for invalid date string', () => {
  const results = mapSearchResultsToSourceInputs([
    { title: 'Bad date', url: 'https://example.com', content: 'snip', score: 0.5, publishedAt: 'not-a-date' },
  ]);

  assert.equal(results[0].publishedAt, null);
});

test('mapSearchResultsToSourceInputs returns empty array for empty input', () => {
  assert.deepEqual(mapSearchResultsToSourceInputs([]), []);
});
