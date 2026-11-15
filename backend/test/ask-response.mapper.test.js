const assert = require('node:assert/strict');
const { test } = require('node:test');
const { TurnStatus } = require('@prisma/client');
const {
  mapAskResponse,
  mapAskTurnSummary,
} = require('../src/ask/mappers/ask-response.mapper.ts');
const {
  createCitationRecord,
  createSourceRecord,
  createTurnRecord,
  createThreadRecord,
  publishedAt,
} = require('./ask-test-helpers.js');

test('mapAskResponse uses the latest status even when returning an older completed turn', () => {
  const response = mapAskResponse({
    thread: createThreadRecord({
      turnCount: 2,
      turns: [createTurnRecord({ turnStatus: TurnStatus.PENDING })],
    }),
    turn: createTurnRecord(),
    totalSourceCount: 0,
  });

  assert.equal(response.thread.status, 'running');
  assert.equal(response.thread.turnCount, 2);
  assert.equal(response.turn.status, 'completed');
  assert.equal('turns' in response.thread, false);
});

test('mapAskTurnSummary returns only cited source previews', () => {
  const summary = mapAskTurnSummary(
    createTurnRecord({
      question: 'Explain Prisma relations',
      searchQuery: 'Explain Prisma relations',
      answerMarkdown: 'Only the second source is cited. [2]',
      suggestedFollowUpQuestions: ['What should I read next?'],
      sources: [
        createSourceRecord({
          id: 'source-1',
          citationNumber: 1,
          title: 'Uncited source',
          url: 'https://example.com/uncited',
          domain: 'example.com',
          snippet: 'This source was saved but not cited.',
          provider: 'tavily',
          providerScore: 0.5,
          publishedAt: null,
        }),
        createSourceRecord({
          id: 'source-2',
          citationNumber: 2,
          title: 'Cited source',
          url: 'https://example.com/cited',
          domain: 'example.com',
          snippet: 'This source supports the answer.',
          provider: 'tavily',
          providerScore: 0.9,
          publishedAt,
        }),
      ],
      citations: [
        createCitationRecord({
          id: 'citation-2',
          sourceId: 'source-2',
          citationNumber: 2,
        }),
        createCitationRecord({
          id: 'citation-missing-source',
          sourceId: 'missing-source',
          citationNumber: 3,
        }),
      ],
    }),
  );

  assert.equal(summary.sourceCount, 2);
  assert.equal(summary.citationCount, 1);
  assert.deepEqual(summary.suggestedFollowUpQuestions, [
    'What should I read next?',
  ]);
  assert.equal('sources' in summary, false);
  assert.deepEqual(summary.citations, [
    {
      citationId: 'citation-2',
      citationNumber: 2,
      sourceId: 'source-2',
      title: 'Cited source',
      domain: 'example.com',
      url: 'https://example.com/cited',
      snippet: 'This source supports the answer.',
      publishedAt: publishedAt.toISOString(),
    },
  ]);
});
