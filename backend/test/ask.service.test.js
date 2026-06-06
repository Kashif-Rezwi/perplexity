const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const { ThreadMode, ThreadStatus, TurnStatus } = require('@prisma/client');
const { AskService } = require('../dist/src/ask/ask.service.js');
const { AiService } = require('../dist/src/ai/ai.service.js');
const {
  TavilySearchService,
} = require('../dist/src/search/tavily-search.service.js');
const {
  DEFAULT_OPENAI_MODEL,
  OPENAI_API_KEY_CONFIG_KEY,
  OPENAI_MODEL_CONFIG_KEY,
} = require('../dist/src/ai/ai.constants.js');
const {
  DEFAULT_TAVILY_MAX_RESULTS,
  DEFAULT_TAVILY_SEARCH_DEPTH,
  TAVILY_API_KEY_CONFIG_KEY,
} = require('../dist/src/search/search.constants.js');

const threadId = '11111111-1111-4111-8111-111111111111';
const turnId = '22222222-2222-4222-8222-222222222222';
const createdAt = new Date('2026-06-04T00:00:00.000Z');
const updatedAt = new Date('2026-06-04T00:05:00.000Z');
const completedAt = new Date('2026-06-04T00:04:00.000Z');

function createThreadRecord(overrides = {}) {
  return {
    id: threadId,
    title: 'Explain Prisma relations',
    answerPreview: overrides.answerPreview ?? 'Prisma relations connect rows.',
    status: overrides.status ?? ThreadStatus.COMPLETED,
    mode: ThreadMode.WEB,
    createdAt,
    updatedAt,
    _count: { turns: 1 },
    turns: [
      {
        id: turnId,
        question: 'Explain Prisma relations',
        searchQuery: 'Explain Prisma relations',
        answerMarkdown:
          overrides.answerMarkdown ?? 'Prisma relations connect rows.',
        status: overrides.turnStatus ?? TurnStatus.COMPLETED,
        errorMessage: overrides.errorMessage ?? null,
        createdAt,
        completedAt: overrides.completedAt ?? completedAt,
        sources: [],
        citations: [],
      },
    ],
  };
}

test('AskService creates a thread, completes its turn, and returns persisted data', async () => {
  const answerMarkdown = 'Prisma relations connect rows across tables.';
  const searchResults = [
    {
      title: 'Prisma relations',
      url: 'https://www.prisma.io/docs/orm/prisma-schema/data-model/relations',
      content: 'Relations describe connections between records.',
      score: 0.91,
    },
  ];
  const calls = [];
  const service = new AskService(
    {
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
        return createThreadRecord({ answerMarkdown });
      },
    },
  );

  const response = await service.ask({ question: 'Explain Prisma relations' });

  assert.equal(response.thread.threadId, threadId);
  assert.equal(response.thread.status, 'completed');
  assert.equal(response.thread.sourceCount, 0);
  assert.equal(response.turn.turnId, turnId);
  assert.equal(response.turn.answerMarkdown, answerMarkdown);
  assert.deepEqual(response.turn.sources, []);
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
        searchResults,
      },
    ],
    [
      'completeTurn',
      {
        threadId,
        turnId,
        answerMarkdown,
        answerPreview: answerMarkdown,
      },
    ],
    ['findThreadDetailById', threadId],
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

test('AskService marks the pending turn failed when AI generation fails', async () => {
  const error = new ServiceUnavailableException('OpenAI answer generation failed');
  const searchResults = [];
  const calls = [];
  const service = new AskService(
    {
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
        searchResults,
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
});
