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

test('AskService appends a follow-up turn with prior thread context', async () => {
  const question = 'What about Prisma pricing?';
  const standaloneSearchQuery = 'Prisma pricing current plans';
  const answerMarkdown = 'Prisma pricing depends on the plan. [1]';
  const priorTurns = createPriorCompletedTurns(6);
  const expectedPriorTurns = priorTurns.slice(-5).map((turn) => ({
    question: turn.question,
    answerMarkdown: turn.answerMarkdown,
  }));
  const expectedRewritePriorTurns = priorTurns.slice(-3).map((turn) => ({
    question: turn.question,
    answerMarkdown: turn.answerMarkdown,
  }));
  const searchResults = [
    {
      title: 'Prisma pricing',
      url: 'https://www.prisma.io/pricing',
      content: 'Prisma pricing includes multiple plans.',
      score: 0.87,
      publishedAt: null,
    },
  ];
  const sourceInputs = [
    {
      citationNumber: 1,
      title: 'Prisma pricing',
      url: 'https://www.prisma.io/pricing',
      domain: 'prisma.io',
      snippet: 'Prisma pricing includes multiple plans.',
      provider: 'tavily',
      providerScore: 0.87,
      publishedAt: null,
    },
  ];
  const pendingFollowUpTurn = createTurnRecord({
    id: followUpTurnId,
    question,
    searchQuery: standaloneSearchQuery,
    answerMarkdown: null,
    turnStatus: TurnStatus.PENDING,
    completedAt: null,
  });
  const completedFollowUpTurn = createTurnRecord({
    id: followUpTurnId,
    question,
    searchQuery: standaloneSearchQuery,
    answerMarkdown,
    sources: [
      createSourceRecord({
        title: 'Prisma pricing',
        url: 'https://www.prisma.io/pricing',
        snippet: 'Prisma pricing includes multiple plans.',
        providerScore: 0.87,
        publishedAt: null,
      }),
    ],
    citations: [createCitationRecord()],
  });
  let findCalls = 0;
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async generateStandaloneSearchQuery(input) {
        calls.push(['generateStandaloneSearchQuery', input]);
        return standaloneSearchQuery;
      },
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
      async findThreadDetailById(id) {
        calls.push(['findThreadDetailById', id]);
        findCalls += 1;

        return findCalls === 1
          ? createThreadRecord({ turns: priorTurns })
          : createThreadRecord({
              turns: [...priorTurns, completedFollowUpTurn],
            });
      },
      async findThreadWithSingleTurn(id, tId) {
        calls.push(['findThreadWithSingleTurn', id, tId]);
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 7 }) }),
          turn: completedFollowUpTurn,
          totalSourceCount: 1,
        };
      },
      async appendPendingTurnToThread(input) {
        calls.push(['appendPendingTurnToThread', input]);
        return createThreadRecord({
          turns: [...priorTurns, pendingFollowUpTurn],
        });
      },
      async completeTurn(input) {
        calls.push(['completeTurn', input]);
      },
    },
  );

  const response = await service.ask({ question, threadId });

  assert.equal(response.thread.threadId, threadId);
  assert.equal(response.thread.turnCount, 7);
  assert.equal(response.turn.turnId, followUpTurnId);
  assert.equal(response.turn.searchQuery, standaloneSearchQuery);
  assert.equal(response.turn.answerMarkdown, answerMarkdown);
  assert.equal(response.turn.sourceCount, 1);
  assert.equal(response.turn.citationCount, 1);
  assert.equal('sources' in response.turn, false);
  assert.deepEqual(response.turn.citations, [
    {
      citationId,
      citationNumber: 1,
      sourceId,
      title: 'Prisma pricing',
      domain: 'prisma.io',
      url: 'https://www.prisma.io/pricing',
      snippet: 'Prisma pricing includes multiple plans.',
      publishedAt: null,
    },
  ]);
  assert.deepEqual(calls, [
    ['findThreadDetailById', threadId],
    [
      'generateStandaloneSearchQuery',
      {
        question,
        threadTitle: 'Explain Prisma relations',
        priorTurns: expectedRewritePriorTurns,
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
      'generateAnswer',
      {
        question,
        priorTurns: expectedPriorTurns,
        sources: sourceInputs,
      },
    ],
    [
      'completeTurn',
      {
        threadId,
        turnId: followUpTurnId,
        answerMarkdown,
        answerPreview: answerMarkdown,
        sources: sourceInputs,
        citationNumbers: [1],
        suggestedFollowUpQuestions: [],
      },
    ],
    ['findThreadWithSingleTurn', threadId, followUpTurnId]
  ]);
});

test('AskService falls back to the raw follow-up question when rewrite fails', async () => {
  const question = 'What about pricing?';
  const answerMarkdown = 'Prisma pricing depends on the plan.';
  const priorTurns = createPriorCompletedTurns(1);
  const expectedPriorTurns = priorTurns.map((turn) => ({
    question: turn.question,
    answerMarkdown: turn.answerMarkdown,
  }));
  const pendingFollowUpTurn = createTurnRecord({
    id: followUpTurnId,
    question,
    searchQuery: question,
    answerMarkdown: null,
    turnStatus: TurnStatus.PENDING,
    completedAt: null,
  });
  const completedFollowUpTurn = createTurnRecord({
    id: followUpTurnId,
    question,
    searchQuery: question,
    answerMarkdown,
  });
  let findCalls = 0;
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async generateStandaloneSearchQuery(input) {
        calls.push(['generateStandaloneSearchQuery', input]);
        throw new ServiceUnavailableException(
          'OpenAI search query generation failed',
        );
      },
      async generateAnswer(input) {
        calls.push(['generateAnswer', input]);
        return answerMarkdown;
      },
      async generateSuggestedFollowUpQuestions(input) {
        calls.push(['generateSuggestedFollowUpQuestions', input]);
        return [];
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        return [];
      },
    },
    {
      async findThreadDetailById(id) {
        calls.push(['findThreadDetailById', id]);
        findCalls += 1;

        return findCalls === 1
          ? createThreadRecord({ turns: priorTurns })
          : createThreadRecord({
              turns: [...priorTurns, completedFollowUpTurn],
            });
      },
      async findThreadWithSingleTurn(id, tId) {
        calls.push(['findThreadWithSingleTurn', id, tId]);
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 7 }) }),
          turn: completedFollowUpTurn,
          totalSourceCount: 1,
        };
      },
      async appendPendingTurnToThread(input) {
        calls.push(['appendPendingTurnToThread', input]);
        return createThreadRecord({
          turns: [...priorTurns, pendingFollowUpTurn],
        });
      },
      async completeTurn(input) {
        calls.push(['completeTurn', input]);
      },
    },
  );

  const response = await service.ask({ question, threadId });

  assert.equal(response.turn.turnId, followUpTurnId);
  assert.equal(response.turn.searchQuery, question);
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
        searchQuery: question,
      },
    ],
    ['search', { query: question }],
    [
      'generateAnswer',
      {
        question,
        priorTurns: expectedPriorTurns,
        sources: [],
      },
    ],
    [
      'generateSuggestedFollowUpQuestions',
      {
        question,
        answerMarkdown,
        priorTurns: expectedPriorTurns,
        sources: [],
      },
    ],
    [
      'completeTurn',
      {
        threadId,
        turnId: followUpTurnId,
        answerMarkdown,
        answerPreview: answerMarkdown,
        sources: [],
        citationNumbers: [],
        suggestedFollowUpQuestions: [],
      },
    ],
    ['findThreadWithSingleTurn', threadId, followUpTurnId]
  ]);
});

test('AskService falls back to the raw follow-up question when rewrite times out', async () => {
  const question = 'What about pricing?';
  const answerMarkdown = 'Prisma pricing depends on the plan.';
  const priorTurns = createPriorCompletedTurns(1);
  const pendingFollowUpTurn = createTurnRecord({
    id: followUpTurnId,
    question,
    searchQuery: question,
    answerMarkdown: null,
    turnStatus: TurnStatus.PENDING,
    completedAt: null,
  });
  const completedFollowUpTurn = createTurnRecord({
    id: followUpTurnId,
    question,
    searchQuery: question,
    answerMarkdown,
  });
  let findCalls = 0;
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      getQueryRewriteTimeoutMs() {
        return 1;
      },
      async generateStandaloneSearchQuery(input, abortSignal) {
        calls.push(['generateStandaloneSearchQuery', input]);
        return delayWithAbort(25, 'Prisma pricing current plans', abortSignal);
      },
      async generateAnswer(input) {
        calls.push(['generateAnswer', input]);
        return answerMarkdown;
      },
      async generateSuggestedFollowUpQuestions(input) {
        calls.push(['generateSuggestedFollowUpQuestions', input]);
        return [];
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        return [];
      },
    },
    {
      async findThreadDetailById(id) {
        calls.push(['findThreadDetailById', id]);
        findCalls += 1;

        return findCalls === 1
          ? createThreadRecord({ turns: priorTurns })
          : createThreadRecord({
              turns: [...priorTurns, completedFollowUpTurn],
            });
      },
      async findThreadWithSingleTurn(id, tId) {
        calls.push(['findThreadWithSingleTurn', id, tId]);
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 7 }) }),
          turn: completedFollowUpTurn,
          totalSourceCount: 1,
        };
      },
      async appendPendingTurnToThread(input) {
        calls.push(['appendPendingTurnToThread', input]);
        return createThreadRecord({
          turns: [...priorTurns, pendingFollowUpTurn],
        });
      },
      async completeTurn(input) {
        calls.push(['completeTurn', input]);
      },
    },
  );

  const response = await service.ask({ question, threadId });

  assert.equal(response.turn.searchQuery, question);
  assert.deepEqual(
    calls.map(([name]) => name),
    [
      'findThreadDetailById',
      'generateStandaloneSearchQuery',
      'appendPendingTurnToThread',
      'search',
      'generateAnswer',
      'generateSuggestedFollowUpQuestions',
      'completeTurn',
      'findThreadWithSingleTurn',
    ],
  );
  assert.deepEqual(calls[3], ['search', { query: question }]);
});

test('AskService rejects follow-up for a missing thread before search', async () => {
  const calls = [];
  const service = createTestAskService(
    {
      async generateStandaloneSearchQuery() {
        calls.push(['generateStandaloneSearchQuery']);
      },
      async generateAnswer() {
        calls.push(['generateAnswer']);
      },
    },
    {
      async search() {
        calls.push(['search']);
      },
    },
    {
      async findThreadDetailById(id) {
        calls.push(['findThreadDetailById', id]);
        return null;
      },
      async findThreadWithSingleTurn(id, tId) {
        calls.push(['findThreadWithSingleTurn', id, tId]);
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 1 }) }),
          turn: createTurnRecord(),
          totalSourceCount: 0,
        };
      },
    },
  );

  await assert.rejects(
    () => service.ask({ question: 'What about pricing?', threadId }),
    (error) => error instanceof NotFoundException,
  );
  assert.deepEqual(calls, [['findThreadDetailById', threadId]]);
});
