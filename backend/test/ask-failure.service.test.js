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

test('AskService marks the appended follow-up turn failed when search fails', async () => {
  const question = 'What about pricing?';
  const standaloneSearchQuery = 'Prisma pricing current plans';
  const error = new ServiceUnavailableException('Tavily search failed');
  const priorTurns = createPriorCompletedTurns(1);
  const expectedPriorTurns = priorTurns.map((turn) => ({
    question: turn.question,
    answerMarkdown: turn.answerMarkdown,
  }));
  const pendingFollowUpTurn = createTurnRecord({
    id: followUpTurnId,
    question,
    searchQuery: standaloneSearchQuery,
    answerMarkdown: null,
    turnStatus: TurnStatus.PENDING,
    completedAt: null,
  });
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async generateStandaloneSearchQuery(input) {
        calls.push(['generateStandaloneSearchQuery', input]);
        return standaloneSearchQuery;
      },
      async generateAnswer() {
        calls.push(['generateAnswer']);
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        throw error;
      },
    },
    {
      async findThreadDetailById(id) {
        calls.push(['findThreadDetailById', id]);
        return createThreadRecord({ turns: priorTurns });
      },
      async findThreadWithSingleTurn(id, tId) {
        calls.push(['findThreadWithSingleTurn', id, tId]);
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 1 }) }),
          turn: createTurnRecord(),
          totalSourceCount: 0,
        };
      },
      async appendPendingTurnToThread(input) {
        calls.push(['appendPendingTurnToThread', input]);
        return createThreadRecord({
          turns: [...priorTurns, pendingFollowUpTurn],
        });
      },
      async failTurn(input) {
        calls.push(['failTurn', input]);
      },
    },
  );

  await assert.rejects(
    () => service.ask({ question, threadId }),
    (receivedError) => receivedError === error,
  );
  assert.deepEqual(calls, [
    ['findThreadDetailById', threadId],
    [
      'generateStandaloneSearchQuery',
      {
        question,
        threadTitle: 'Explain Prisma relations',
        priorTurns: expectedPriorTurns,
      },
    ],
    [
      'appendPendingTurnToThread',
      {
        threadId,
        question,
        searchQuery: standaloneSearchQuery,
      },
    ],
    ['search', { query: standaloneSearchQuery }],
    [
      'failTurn',
      {
        threadId,
        turnId: followUpTurnId,
        errorMessage: 'Tavily search failed',
      },
    ],
  ]);
});

test('AskService marks the pending turn failed when search fails', async () => {
  const error = new ServiceUnavailableException('Tavily search failed');
  const calls = [];
  const service = createTestAskService(
    {
      async generateAnswer() {
        calls.push(['generateAnswer']);
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        throw error;
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
      async failTurn(input) {
        calls.push(['failTurn', input]);
      },
    },
  );

  await assert.rejects(
    () => service.ask({ question: 'Explain Prisma relations' }),
    (receivedError) => receivedError === error,
  );
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
      'failTurn',
      {
        threadId,
        turnId,
        errorMessage: 'Tavily search failed',
      },
    ],
  ]);
});

test('AskService marks the pending turn failed when search times out', async () => {
  const error = new ServiceUnavailableException('Tavily search timed out');
  const calls = [];
  const service = createTestAskService(
    {
      async generateAnswer() {
        calls.push(['generateAnswer']);
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        throw error;
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
      async failTurn(input) {
        calls.push(['failTurn', input]);
      },
    },
  );

  await assert.rejects(
    () => service.ask({ question: 'Explain Prisma relations' }),
    (receivedError) => receivedError === error,
  );
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
      'failTurn',
      {
        threadId,
        turnId,
        errorMessage: 'Tavily search timed out',
      },
    ],
  ]);
});

test('AskService marks the pending turn failed when AI generation fails', async () => {
  const error = new ServiceUnavailableException('OpenAI answer generation failed');
  const searchResults = [];
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async generateAnswer(input) {
        calls.push(['generateAnswer', input]);
        throw error;
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
      async failTurn(input) {
        calls.push(['failTurn', input]);
      },
    },
  );

  await assert.rejects(
    () => service.ask({ question: 'Explain Prisma relations' }),
    (receivedError) => receivedError === error,
  );
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
      'failTurn',
      {
        threadId,
        turnId,
        errorMessage: 'OpenAI answer generation failed',
      },
    ],
  ]);
});

test('AskService marks the pending turn failed when answer generation times out', async () => {
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      getAnswerTimeoutMs() {
        return 1;
      },
      async generateAnswer(input, abortSignal) {
        calls.push(['generateAnswer', input]);
        return delayWithAbort(25, 'Prisma relations connect rows.', abortSignal);
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
      async failTurn(input) {
        calls.push(['failTurn', input]);
      },
    },
  );

  await assert.rejects(
    () => service.ask({ question: 'Explain Prisma relations' }),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'OpenAI answer generation timed out',
  );
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
      'failTurn',
      {
        threadId,
        turnId,
        errorMessage: 'OpenAI answer generation timed out',
      },
    ],
  ]);
});

test('AskService completes with empty suggestions when suggestion generation times out', async () => {
  const answerMarkdown = 'Prisma relations connect rows across tables.';
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      getSuggestionTimeoutMs() {
        return 1;
      },
      async generateAnswer(input) {
        calls.push(['generateAnswer', input]);
        return answerMarkdown;
      },
      async generateSuggestedFollowUpQuestions(input, abortSignal) {
        calls.push(['generateSuggestedFollowUpQuestions', input]);
        return delayWithAbort(25, ['What should I read next?'], abortSignal);
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

test('AskService marks the pending turn failed when completion fails', async () => {
  const error = new ServiceUnavailableException('Source persistence failed');
  const answerMarkdown = 'Prisma relations connect rows across tables. [1]';
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
        throw error;
      },
      async failTurn(input) {
        calls.push(['failTurn', input]);
      },
    },
  );

  await assert.rejects(
    () => service.ask({ question: 'Explain Prisma relations' }),
    (receivedError) => receivedError === error,
  );
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
        citationNumbers: [1],
        suggestedFollowUpQuestions: [],
      },
    ],
    [
      'failTurn',
      {
        threadId,
        turnId,
        errorMessage: 'Source persistence failed',
      },
    ],
  ]);
});
