const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NotFoundException, ServiceUnavailableException } = require('@nestjs/common');
const { ThreadMode, ThreadStatus, TurnStatus } = require('@prisma/client');
const { AskService } = require('../dist/src/ask/ask.service.js');
const { AiService } = require('../dist/src/ai/ai.service.js');
const {
  TavilySearchService,
} = require('../dist/src/search/tavily-search.service.js');
const {
  mapAskTurnSummary,
} = require('../dist/src/ask/mappers/ask-response.mapper.js');
const {
  DEFAULT_OPENAI_ANSWER_TIMEOUT_MS,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_QUERY_REWRITE_TIMEOUT_MS,
  DEFAULT_OPENAI_SUGGESTION_TIMEOUT_MS,
  DEFAULT_OPENAI_UTILITY_MODEL,
  OPENAI_API_KEY_CONFIG_KEY,
  OPENAI_ANSWER_TIMEOUT_MS_CONFIG_KEY,
  OPENAI_MODEL_CONFIG_KEY,
  OPENAI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY,
  OPENAI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY,
  OPENAI_UTILITY_MODEL_CONFIG_KEY,
} = require('../dist/src/ai/ai.constants.js');
const { withTimeout } = require('../dist/src/common/with-timeout.js');
const {
  DEFAULT_TAVILY_MAX_RESULTS,
  DEFAULT_TAVILY_SEARCH_DEPTH,
  DEFAULT_TAVILY_SEARCH_TIMEOUT_MS,
  TAVILY_API_KEY_CONFIG_KEY,
  TAVILY_SEARCH_TIMEOUT_MS_CONFIG_KEY,
} = require('../dist/src/search/search.constants.js');

const threadId = '11111111-1111-4111-8111-111111111111';
const turnId = '22222222-2222-4222-8222-222222222222';
const followUpTurnId = '55555555-5555-4555-8555-555555555555';
const sourceId = '33333333-3333-4333-8333-333333333333';
const citationId = '44444444-4444-4444-8444-444444444444';
const createdAt = new Date('2026-06-04T00:00:00.000Z');
const updatedAt = new Date('2026-06-04T00:05:00.000Z');
const completedAt = new Date('2026-06-04T00:04:00.000Z');
const publishedAt = new Date('2026-06-03T00:00:00.000Z');

function delay(ms, value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

// Provides the three timeout getters that AiService exposes. Spread into every
// aiService mock so direct calls (e.g. this.aiService.getAnswerTimeoutMs())
// resolve to the production defaults rather than throwing. Tests that need a
// shorter timeout override the specific getter after spreading.
const DEFAULT_AI_TIMEOUTS = {
  getAnswerTimeoutMs() { return DEFAULT_OPENAI_ANSWER_TIMEOUT_MS; },
  getQueryRewriteTimeoutMs() { return DEFAULT_OPENAI_QUERY_REWRITE_TIMEOUT_MS; },
  getSuggestionTimeoutMs() { return DEFAULT_OPENAI_SUGGESTION_TIMEOUT_MS; },
};

// Simulates a slow async operation that respects an AbortSignal, mirroring what
// the Vercel AI SDK does when the signal fires during a fetch. Used in timeout
// tests so the AbortController-based cancellation in AskService can be tested
// without relying on a race between two Promises.
function delayWithAbort(ms, value, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
    }
    const timer = setTimeout(() => resolve(value), ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
    }, { once: true });
  });
}

function createSourceRecord(overrides = {}) {
  return {
    id: overrides.id ?? sourceId,
    turnId,
    citationNumber: overrides.citationNumber ?? 1,
    title: overrides.title ?? 'Prisma relations',
    url:
      overrides.url ??
      'https://www.prisma.io/docs/orm/prisma-schema/data-model/relations',
    domain: overrides.domain ?? 'prisma.io',
    snippet:
      overrides.snippet ?? 'Relations describe connections between records.',
    provider: overrides.provider ?? 'tavily',
    providerScore: overrides.providerScore ?? 0.91,
    publishedAt: 'publishedAt' in overrides ? overrides.publishedAt : publishedAt,
    createdAt,
  };
}

function createCitationRecord(overrides = {}) {
  return {
    id: overrides.id ?? citationId,
    turnId,
    sourceId: overrides.sourceId ?? sourceId,
    citationNumber: overrides.citationNumber ?? 1,
    createdAt,
  };
}

function createTurnRecord(overrides = {}) {
  return {
    id: overrides.id ?? turnId,
    question: overrides.question ?? 'Explain Prisma relations',
    searchQuery: overrides.searchQuery ?? 'Explain Prisma relations',
    answerMarkdown:
      overrides.answerMarkdown ?? 'Prisma relations connect rows.',
    suggestedFollowUpQuestions: overrides.suggestedFollowUpQuestions ?? [],
    status: overrides.turnStatus ?? TurnStatus.COMPLETED,
    errorMessage: overrides.errorMessage ?? null,
    createdAt: overrides.createdAt ?? createdAt,
    completedAt: overrides.completedAt ?? completedAt,
    sources: overrides.sources ?? [],
    citations: overrides.citations ?? [],
  };
}

function createThreadRecord(overrides = {}) {
  const turns = overrides.turns ?? [createTurnRecord(overrides)];

  return {
    id: threadId,
    title: 'Explain Prisma relations',
    answerPreview: overrides.answerPreview ?? 'Prisma relations connect rows.',
    status: overrides.status ?? ThreadStatus.COMPLETED,
    mode: ThreadMode.WEB,
    createdAt,
    updatedAt,
    _count: { turns: turns.length },
    turns,
  };
}

function createPriorCompletedTurns(count) {
  return Array.from({ length: count }, (_, index) => {
    const turnNumber = index + 1;

    return createTurnRecord({
      id: `prior-turn-${turnNumber}`,
      question: `Prior question ${turnNumber}`,
      searchQuery: `Prior question ${turnNumber}`,
      answerMarkdown: `Prior answer ${turnNumber}`,
      completedAt,
    });
  });
}

test('mapAskTurnSummary returns only cited source previews', () => {
  const summary = mapAskTurnSummary({
    turnId,
    question: 'Explain Prisma relations',
    searchQuery: 'Explain Prisma relations',
    answerMarkdown: 'Only the second source is cited. [2]',
    suggestedFollowUpQuestions: ['What should I read next?'],
    status: 'completed',
    errorMessage: null,
    sourceCount: 2,
    sources: [
      {
        sourceId: 'source-1',
        citationNumber: 1,
        title: 'Uncited source',
        url: 'https://example.com/uncited',
        domain: 'example.com',
        snippet: 'This source was saved but not cited.',
        provider: 'tavily',
        providerScore: 0.5,
        publishedAt: null,
        createdAt: createdAt.toISOString(),
      },
      {
        sourceId: 'source-2',
        citationNumber: 2,
        title: 'Cited source',
        url: 'https://example.com/cited',
        domain: 'example.com',
        snippet: 'This source supports the answer.',
        provider: 'tavily',
        providerScore: 0.9,
        publishedAt: publishedAt.toISOString(),
        createdAt: createdAt.toISOString(),
      },
    ],
    citations: [
      {
        citationId: 'citation-2',
        sourceId: 'source-2',
        citationNumber: 2,
        createdAt: createdAt.toISOString(),
      },
      {
        citationId: 'citation-missing-source',
        sourceId: 'missing-source',
        citationNumber: 3,
        createdAt: createdAt.toISOString(),
      },
    ],
    citationCount: 2,
    createdAt: createdAt.toISOString(),
    completedAt: completedAt.toISOString(),
  });

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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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
  const service = new AskService(
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

test('AiService fails clearly when OPENAI_API_KEY is missing', async () => {
  const service = new AiService({
    get() {
      return undefined;
    },
  });

  await assert.rejects(
    () => service.generateAnswer({ question: 'Explain Prisma relations' }),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'OPENAI_API_KEY is not configured',
  );
});

test('AiService suggestion generation fails clearly when OPENAI_API_KEY is missing', async () => {
  const service = new AiService({
    get() {
      return undefined;
    },
  });

  await assert.rejects(
    () =>
      service.generateSuggestedFollowUpQuestions({
        question: 'Explain Prisma relations',
        answerMarkdown: 'Prisma relations connect rows.',
      }),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'OPENAI_API_KEY is not configured',
  );
});

test('AiService uses the default model when OPENAI_MODEL is missing', () => {
  const service = new AiService({
    get(key) {
      if (key === OPENAI_API_KEY_CONFIG_KEY) {
        return 'test-api-key';
      }

      return undefined;
    },
  });

  assert.equal(service.getModel(), DEFAULT_OPENAI_MODEL);
});

test('AiService uses configured OPENAI_MODEL when present', () => {
  const model = 'gpt-test-model';
  const service = new AiService({
    get(key) {
      if (key === OPENAI_API_KEY_CONFIG_KEY) {
        return 'test-api-key';
      }

      if (key === OPENAI_MODEL_CONFIG_KEY) {
        return model;
      }

      return undefined;
    },
  });

  assert.equal(service.getModel(), model);
});

test('AiService uses the default utility model when OPENAI_UTILITY_MODEL is missing', () => {
  const model = 'gpt-answer-model';
  const service = new AiService({
    get(key) {
      if (key === OPENAI_MODEL_CONFIG_KEY) {
        return model;
      }

      return undefined;
    },
  });

  assert.equal(service.getUtilityModel(), DEFAULT_OPENAI_UTILITY_MODEL);
});

test('AiService uses configured OPENAI_UTILITY_MODEL when present', () => {
  const utilityModel = 'gpt-utility-model';
  const service = new AiService({
    get(key) {
      if (key === OPENAI_MODEL_CONFIG_KEY) {
        return 'gpt-answer-model';
      }

      if (key === OPENAI_UTILITY_MODEL_CONFIG_KEY) {
        return utilityModel;
      }

      return undefined;
    },
  });

  assert.equal(service.getUtilityModel(), utilityModel);
});

test('AiService uses default timeout config when optional env vars are missing', () => {
  const service = new AiService({
    get() {
      return undefined;
    },
  });

  assert.equal(service.getAnswerTimeoutMs(), DEFAULT_OPENAI_ANSWER_TIMEOUT_MS);
  assert.equal(
    service.getQueryRewriteTimeoutMs(),
    DEFAULT_OPENAI_QUERY_REWRITE_TIMEOUT_MS,
  );
  assert.equal(
    service.getSuggestionTimeoutMs(),
    DEFAULT_OPENAI_SUGGESTION_TIMEOUT_MS,
  );
});

test('AiService fails clearly when timeout config is invalid', () => {
  const service = new AiService({
    get(key) {
      if (key === OPENAI_ANSWER_TIMEOUT_MS_CONFIG_KEY) {
        return '0';
      }

      if (key === OPENAI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY) {
        return 'not-a-number';
      }

      if (key === OPENAI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY) {
        return '-10';
      }

      return undefined;
    },
  });

  assert.throws(
    () => service.getAnswerTimeoutMs(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'OPENAI_ANSWER_TIMEOUT_MS must be a positive integer',
  );
  assert.throws(
    () => service.getQueryRewriteTimeoutMs(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message ===
        'OPENAI_QUERY_REWRITE_TIMEOUT_MS must be a positive integer',
  );
  assert.throws(
    () => service.getSuggestionTimeoutMs(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message ===
        'OPENAI_SUGGESTION_TIMEOUT_MS must be a positive integer',
  );
});

test('TavilySearchService fails clearly when TAVILY_API_KEY is missing', async () => {
  const service = new TavilySearchService({
    get() {
      return undefined;
    },
  });

  await assert.rejects(
    () => service.search({ query: 'Explain Prisma relations' }),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'TAVILY_API_KEY is not configured',
  );
});

test('TavilySearchService uses default search config when optional env vars are missing', () => {
  const service = new TavilySearchService({
    get(key) {
      if (key === TAVILY_API_KEY_CONFIG_KEY) {
        return 'test-tavily-key';
      }

      return undefined;
    },
  });

  assert.equal(service.getMaxResults(), DEFAULT_TAVILY_MAX_RESULTS);
  assert.equal(service.getSearchDepth(), DEFAULT_TAVILY_SEARCH_DEPTH);
  assert.equal(service.getSearchTimeoutMs(), DEFAULT_TAVILY_SEARCH_TIMEOUT_MS);
});

test('TavilySearchService fails clearly when timeout config is invalid', () => {
  const service = new TavilySearchService({
    get(key) {
      if (key === TAVILY_SEARCH_TIMEOUT_MS_CONFIG_KEY) {
        return '0';
      }

      return undefined;
    },
  });

  assert.throws(
    () => service.getSearchTimeoutMs(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'TAVILY_SEARCH_TIMEOUT_MS must be a positive integer',
  );
});

test('withTimeout resolves when the operation finishes in time', async () => {
  await assert.doesNotReject(async () => {
    const result = await withTimeout(
      Promise.resolve('done'),
      50,
      () => new Error('timed out'),
    );

    assert.equal(result, 'done');
  });
});

test('withTimeout rejects with the original error when the operation fails', async () => {
  const originalError = new Error('provider failed');

  await assert.rejects(
    () =>
      withTimeout(
        Promise.reject(originalError),
        50,
        () => new Error('timed out'),
      ),
    (error) => error === originalError,
  );
});

test('withTimeout rejects with the timeout error when the operation is slow', async () => {
  await assert.rejects(
    () =>
      withTimeout(
        delay(25, 'late'),
        1,
        () => new ServiceUnavailableException('provider timed out'),
      ),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'provider timed out',
  );
});
