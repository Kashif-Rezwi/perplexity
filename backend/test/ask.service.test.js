const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NotFoundException, ServiceUnavailableException } = require('@nestjs/common');
const { TurnStatus } = require('@prisma/client');
const {
  DEFAULT_AI_TIMEOUTS,
  citationId,
  createCitationRecord,
  createPriorCompletedTurns,
  createSourceRecord,
  createTestAskService,
  createThreadRecord,
  createTurnRecord,
  delayWithAbort,
  followUpTurnId,
  publishedAt,
  sourceId,
  threadId,
  turnId,
} = require('./ask-test-helpers.js');

test('AskService creates a thread, completes its turn, and returns persisted data', async () => {
  const answerMarkdown = 'Prisma relations connect rows across tables. [1]';
  const suggestedFollowUpQuestions = [
    'How do Prisma relation fields work?',
    'How do I create related records in Prisma?',
    'How do Prisma foreign keys map to database columns?',
  ];
  const searchResults = [
    {
      title: 'Prisma relations',
      url: 'https://www.prisma.io/docs/orm/prisma-schema/data-model/relations',
      content: 'Relations describe connections between records.',
      score: 0.91,
      publishedAt: publishedAt.toISOString(),
    },
  ];
  const sourceInputs = [
    {
      citationNumber: 1,
      title: 'Prisma relations',
      url: 'https://www.prisma.io/docs/orm/prisma-schema/data-model/relations',
      domain: 'prisma.io',
      snippet: 'Relations describe connections between records.',
      provider: 'tavily',
      providerScore: 0.91,
      publishedAt,
    },
  ];
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async generateStandaloneSearchQuery() {
        assert.fail('new asks must not rewrite search queries');
      },
      async generateAnswer(input) {
        calls.push(['generateAnswer', input]);
        return answerMarkdown;
      },
      async generateSuggestedFollowUpQuestions(input) {
        calls.push(['generateSuggestedFollowUpQuestions', input]);
        return suggestedFollowUpQuestions;
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        return searchResults;
      },
    },
    {
      async createThreadWithPendingTurn(input) {
        calls.push(['createThreadWithPendingTurn', input]);
        return createThreadRecord({
          answerMarkdown: null,
          answerPreview: null,
          turnStatus: TurnStatus.PENDING,
          completedAt: null,
        });
      },
      async completeTurn(input) {
        calls.push(['completeTurn', input]);
      },
      async findThreadDetailById(id) {
        calls.push(['findThreadDetailById', id]);
        return createThreadRecord({
          answerMarkdown,
          suggestedFollowUpQuestions,
          sources: [createSourceRecord()],
          citations: [createCitationRecord()],
        });
      },
      async findThreadWithSingleTurn(id, tId) {
        calls.push(['findThreadWithSingleTurn', id, tId]);
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 1 }) }),
          turn: createTurnRecord({ answerMarkdown, suggestedFollowUpQuestions, sources: [createSourceRecord()], citations: [createCitationRecord()] }),
          totalSourceCount: 1,
        };
      },
    },
  );

  const response = await service.ask({ question: 'Explain Prisma relations' });

  assert.equal(response.thread.threadId, threadId);
  assert.equal(response.thread.status, 'completed');
  assert.equal(response.thread.totalSourceCount, 1);
  assert.equal(response.turn.turnId, turnId);
  assert.equal(response.turn.answerMarkdown, answerMarkdown);
  assert.deepEqual(
    response.turn.suggestedFollowUpQuestions,
    suggestedFollowUpQuestions,
  );
  assert.equal(response.turn.sourceCount, 1);
  assert.equal(response.turn.citationCount, 1);
  assert.equal('sources' in response.turn, false);
  assert.deepEqual(response.turn.citations, [
    {
      citationId,
      citationNumber: 1,
      sourceId,
      title: 'Prisma relations',
      domain: 'prisma.io',
      url: 'https://www.prisma.io/docs/orm/prisma-schema/data-model/relations',
      snippet: 'Relations describe connections between records.',
      publishedAt: publishedAt.toISOString(),
    },
  ]);
  assert.deepEqual(calls, [
    [
      'createThreadWithPendingTurn',
      {
        title: 'Explain Prisma relations',
        question: 'Explain Prisma relations',
        searchQuery: 'Explain Prisma relations',
      },
    ],
    ['search', { query: 'Explain Prisma relations' }],
    [
      'generateAnswer',
      {
        question: 'Explain Prisma relations',
        priorTurns: [],
        sources: sourceInputs,
      },
    ],
    [
      'generateSuggestedFollowUpQuestions',
      {
        question: 'Explain Prisma relations',
        answerMarkdown,
        priorTurns: [],
        sources: sourceInputs,
      },
    ],
    [
      'completeTurn',
      {
        threadId,
        turnId,
        answerMarkdown,
        answerPreview: answerMarkdown,
        sources: sourceInputs,
        citationNumbers: [1],
        suggestedFollowUpQuestions,
      },
    ],
    ['findThreadWithSingleTurn', threadId, turnId]
  ]);
});

test('AskService completes with empty suggestions when suggestion generation fails', async () => {
  const answerMarkdown = 'Prisma relations connect rows across tables.';
  const error = new ServiceUnavailableException('Suggestion generation failed');
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async generateAnswer(input) {
        calls.push(['generateAnswer', input]);
        return answerMarkdown;
      },
      async generateSuggestedFollowUpQuestions(input) {
        calls.push(['generateSuggestedFollowUpQuestions', input]);
        throw error;
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        return [];
      },
    },
    {
      async createThreadWithPendingTurn(input) {
        calls.push(['createThreadWithPendingTurn', input]);
        return createThreadRecord({
          answerMarkdown: null,
          answerPreview: null,
          turnStatus: TurnStatus.PENDING,
          completedAt: null,
        });
      },
      async completeTurn(input) {
        calls.push(['completeTurn', input]);
      },
      async findThreadDetailById(id) {
        calls.push(['findThreadDetailById', id]);
        return createThreadRecord({ answerMarkdown });
      },
      async findThreadWithSingleTurn(id, tId) {
        calls.push(['findThreadWithSingleTurn', id, tId]);
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 1 }) }),
          turn: createTurnRecord({ answerMarkdown, suggestedFollowUpQuestions: [] }),
          totalSourceCount: 0,
        };
      },
    },
  );

  const response = await service.ask({ question: 'Explain Prisma relations' });

  assert.deepEqual(response.turn.suggestedFollowUpQuestions, []);
  assert.deepEqual(calls, [
    [
      'createThreadWithPendingTurn',
      {
        title: 'Explain Prisma relations',
        question: 'Explain Prisma relations',
        searchQuery: 'Explain Prisma relations',
      },
    ],
    ['search', { query: 'Explain Prisma relations' }],
    [
      'generateAnswer',
      {
        question: 'Explain Prisma relations',
        priorTurns: [],
        sources: [],
      },
    ],
    [
      'generateSuggestedFollowUpQuestions',
      {
        question: 'Explain Prisma relations',
        answerMarkdown,
        priorTurns: [],
        sources: [],
      },
    ],
    [
      'completeTurn',
      {
        threadId,
        turnId,
        answerMarkdown,
        answerPreview: answerMarkdown,
        sources: [],
        citationNumbers: [],
        suggestedFollowUpQuestions: [],
      },
    ],
    ['findThreadWithSingleTurn', threadId, turnId]
  ]);
});

test('AskService normalizes citation ranges before persistence', async () => {
  const rawAnswerMarkdown = 'The available sources point to one theme [1-3].';
  const normalizedAnswerMarkdown =
    'The available sources point to one theme [1][2][3].';
  const searchResults = [1, 2, 3].map((citationNumber) => ({
    title: `Source ${citationNumber}`,
    url: `https://example.com/source-${citationNumber}`,
    content: `Snippet ${citationNumber}`,
    score: 0.9,
    publishedAt: null,
  }));
  const sourceInputs = [1, 2, 3].map((citationNumber) => ({
    citationNumber,
    title: `Source ${citationNumber}`,
    url: `https://example.com/source-${citationNumber}`,
    domain: 'example.com',
    snippet: `Snippet ${citationNumber}`,
    provider: 'tavily',
    providerScore: 0.9,
    publishedAt: null,
  }));
  const savedSourceIds = ['source-1', 'source-2', 'source-3'];
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async generateAnswer(input) {
        calls.push(['generateAnswer', input]);
        return rawAnswerMarkdown;
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        return searchResults;
      },
    },
    {
      async createThreadWithPendingTurn(input) {
        calls.push(['createThreadWithPendingTurn', input]);
        return createThreadRecord({
          answerMarkdown: null,
          answerPreview: null,
          turnStatus: TurnStatus.PENDING,
          completedAt: null,
        });
      },
      async completeTurn(input) {
        calls.push(['completeTurn', input]);
      },
      async findThreadDetailById(id) {
        calls.push(['findThreadDetailById', id]);
        return createThreadRecord({
          answerMarkdown: normalizedAnswerMarkdown,
          sources: sourceInputs.map((source, index) =>
            createSourceRecord({
              id: savedSourceIds[index],
              ...source,
            }),
          ),
          citations: sourceInputs.map((source, index) =>
            createCitationRecord({
              id: `citation-${source.citationNumber}`,
              sourceId: savedSourceIds[index],
              citationNumber: source.citationNumber,
            }),
          ),
        });
      },
      async findThreadWithSingleTurn(id, tId) {
        calls.push(['findThreadWithSingleTurn', id, tId]);
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 1 }) }),
          turn: createTurnRecord({
          answerMarkdown: normalizedAnswerMarkdown,
          sources: sourceInputs.map((s, i) => createSourceRecord({ id: savedSourceIds[i], ...s })),
          citations: sourceInputs.map((s, i) => createCitationRecord({ id: "citation-" + s.citationNumber, sourceId: savedSourceIds[i], citationNumber: s.citationNumber })),
        }),
          totalSourceCount: 2,
        };
      },
    },
  );

  const response = await service.ask({ question: 'Explain Prisma relations' });
  const completeTurnCall = calls.find(([name]) => name === 'completeTurn');

  assert.equal(response.turn.answerMarkdown, normalizedAnswerMarkdown);
  assert.equal(response.turn.citationCount, 3);
  assert.deepEqual(
    response.turn.citations.map((citation) => citation.citationNumber),
    [1, 2, 3],
  );
  assert.equal(completeTurnCall[1].answerMarkdown, normalizedAnswerMarkdown);
  assert.deepEqual(completeTurnCall[1].citationNumbers, [1, 2, 3]);
  assert.deepEqual(completeTurnCall[1].suggestedFollowUpQuestions, []);
});

test('AskService returns its completed turn when another turn is newer', async () => {
  const answerMarkdown = 'Prisma relations connect rows across tables.';
  const newerTurn = createTurnRecord({
    id: '66666666-6666-4666-8666-666666666666',
    question: 'A different question',
    searchQuery: 'A different question',
    answerMarkdown: 'A different answer.',
    createdAt: new Date('2026-06-04T00:06:00.000Z'),
    completedAt: new Date('2026-06-04T00:07:00.000Z'),
  });
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async generateAnswer(input) {
        calls.push(['generateAnswer', input]);
        return answerMarkdown;
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        return [];
      },
    },
    {
      async createThreadWithPendingTurn(input) {
        calls.push(['createThreadWithPendingTurn', input]);
        return createThreadRecord({
          answerMarkdown: null,
          answerPreview: null,
          turnStatus: TurnStatus.PENDING,
          completedAt: null,
        });
      },
      async completeTurn(input) {
        calls.push(['completeTurn', input]);
      },
      async findThreadDetailById(id) {
        calls.push(['findThreadDetailById', id]);
        return createThreadRecord({
          turns: [
            createTurnRecord({
              answerMarkdown,
              sources: [],
              citations: [],
            }),
            newerTurn,
          ],
        });
      },
      async findThreadWithSingleTurn(id, tId) {
        calls.push(['findThreadWithSingleTurn', id, tId]);
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 2 }) }),
          turn: createTurnRecord({ answerMarkdown, suggestedFollowUpQuestions: [], sources: [], citations: [] }),
          totalSourceCount: 0,
        };
      },
    },
  );

  const response = await service.ask({ question: 'Explain Prisma relations' });

  assert.equal(response.thread.turnCount, 2);
  assert.equal(response.turn.turnId, turnId);
  assert.equal(response.turn.question, 'Explain Prisma relations');
  assert.equal(response.turn.answerMarkdown, answerMarkdown);
  assert.deepEqual(calls, [
    [
      'createThreadWithPendingTurn',
      {
        title: 'Explain Prisma relations',
        question: 'Explain Prisma relations',
        searchQuery: 'Explain Prisma relations',
      },
    ],
    ['search', { query: 'Explain Prisma relations' }],
    [
      'generateAnswer',
      {
        question: 'Explain Prisma relations',
        priorTurns: [],
        sources: [],
      },
    ],
    [
      'completeTurn',
      {
        threadId,
        turnId,
        answerMarkdown,
        answerPreview: answerMarkdown,
        sources: [],
        citationNumbers: [],
        suggestedFollowUpQuestions: [],
      },
    ],
    ['findThreadWithSingleTurn', threadId, turnId]
  ]);
});

test('AskService completes successfully when search returns no sources', async () => {
  const answerMarkdown = 'Prisma relations connect rows across tables.';
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async generateAnswer(input) {
        calls.push(['generateAnswer', input]);
        return answerMarkdown;
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        return [];
      },
    },
    {
      async createThreadWithPendingTurn(input) {
        calls.push(['createThreadWithPendingTurn', input]);
        return createThreadRecord({
          answerMarkdown: null,
          answerPreview: null,
          turnStatus: TurnStatus.PENDING,
          completedAt: null,
        });
      },
      async completeTurn(input) {
        calls.push(['completeTurn', input]);
      },
      async findThreadDetailById(id) {
        calls.push(['findThreadDetailById', id]);
        return createThreadRecord({ answerMarkdown });
      },
      async findThreadWithSingleTurn(id, tId) {
        calls.push(['findThreadWithSingleTurn', id, tId]);
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 1 }) }),
          turn: createTurnRecord({ answerMarkdown, suggestedFollowUpQuestions: [] }),
          totalSourceCount: 0,
        };
      },
    },
  );

  const response = await service.ask({ question: 'Explain Prisma relations' });

  assert.equal(response.thread.totalSourceCount, 0);
  assert.equal(response.turn.sourceCount, 0);
  assert.equal(response.turn.citationCount, 0);
  assert.equal('sources' in response.turn, false);
  assert.deepEqual(response.turn.citations, []);
  assert.deepEqual(calls, [
    [
      'createThreadWithPendingTurn',
      {
        title: 'Explain Prisma relations',
        question: 'Explain Prisma relations',
        searchQuery: 'Explain Prisma relations',
      },
    ],
    ['search', { query: 'Explain Prisma relations' }],
    [
      'generateAnswer',
      {
        question: 'Explain Prisma relations',
        priorTurns: [],
        sources: [],
      },
    ],
    [
      'completeTurn',
      {
        threadId,
        turnId,
        answerMarkdown,
        answerPreview: answerMarkdown,
        sources: [],
        citationNumbers: [],
        suggestedFollowUpQuestions: [],
      },
    ],
    ['findThreadWithSingleTurn', threadId, turnId]
  ]);
});

test('AskService completes with sources and no citations when answer has no markers', async () => {
  const answerMarkdown = 'Prisma relations connect rows across tables.';
  const searchResults = [
    {
      title: 'Prisma relations',
      url: 'https://www.prisma.io/docs/orm/prisma-schema/data-model/relations',
      content: 'Relations describe connections between records.',
      score: 0.91,
      publishedAt: null,
    },
  ];
  const sourceInputs = [
    {
      citationNumber: 1,
      title: 'Prisma relations',
      url: 'https://www.prisma.io/docs/orm/prisma-schema/data-model/relations',
      domain: 'prisma.io',
      snippet: 'Relations describe connections between records.',
      provider: 'tavily',
      providerScore: 0.91,
      publishedAt: null,
    },
  ];
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async generateAnswer(input) {
        calls.push(['generateAnswer', input]);
        return answerMarkdown;
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        return searchResults;
      },
    },
    {
      async createThreadWithPendingTurn(input) {
        calls.push(['createThreadWithPendingTurn', input]);
        return createThreadRecord({
          answerMarkdown: null,
          answerPreview: null,
          turnStatus: TurnStatus.PENDING,
          completedAt: null,
        });
      },
      async completeTurn(input) {
        calls.push(['completeTurn', input]);
      },
      async findThreadDetailById(id) {
        calls.push(['findThreadDetailById', id]);
        return createThreadRecord({
          answerMarkdown,
          sources: [createSourceRecord({ publishedAt: null })],
        });
      },
      async findThreadWithSingleTurn(id, tId) {
        calls.push(['findThreadWithSingleTurn', id, tId]);
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 1 }) }),
          turn: createTurnRecord({ answerMarkdown, suggestedFollowUpQuestions: [], sources: [createSourceRecord()] }),
          totalSourceCount: 1,
        };
      },
    },
  );

  const response = await service.ask({ question: 'Explain Prisma relations' });

  assert.equal(response.thread.totalSourceCount, 1);
  assert.equal(response.turn.sourceCount, 1);
  assert.equal(response.turn.citationCount, 0);
  assert.equal('sources' in response.turn, false);
  assert.deepEqual(response.turn.citations, []);
  assert.deepEqual(calls, [
    [
      'createThreadWithPendingTurn',
      {
        title: 'Explain Prisma relations',
        question: 'Explain Prisma relations',
        searchQuery: 'Explain Prisma relations',
      },
    ],
    ['search', { query: 'Explain Prisma relations' }],
    [
      'generateAnswer',
      {
        question: 'Explain Prisma relations',
        priorTurns: [],
        sources: sourceInputs,
      },
    ],
    [
      'completeTurn',
      {
        threadId,
        turnId,
        answerMarkdown,
        answerPreview: answerMarkdown,
        sources: sourceInputs,
        citationNumbers: [],
        suggestedFollowUpQuestions: [],
      },
    ],
    ['findThreadWithSingleTurn', threadId, turnId]
  ]);
});
