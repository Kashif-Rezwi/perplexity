const { ThreadMode, ThreadStatus, TurnStatus } = require('@prisma/client');
const { AskService } = require('../src/ask/ask.service.ts');
const { AiService } = require('../src/ai/ai.service.ts');
const {
  DEFAULT_OPENAI_ANSWER_TIMEOUT_MS,
  DEFAULT_OPENAI_QUERY_REWRITE_TIMEOUT_MS,
  DEFAULT_OPENAI_SUGGESTION_TIMEOUT_MS,
} = require('../src/ai/ai.constants.ts');

const threadId = '11111111-1111-4111-8111-111111111111';
const turnId = '22222222-2222-4222-8222-222222222222';
const followUpTurnId = '55555555-5555-4555-8555-555555555555';
const sourceId = '33333333-3333-4333-8333-333333333333';
const citationId = '44444444-4444-4444-8444-444444444444';
const createdAt = new Date('2026-06-04T00:00:00.000Z');
const updatedAt = new Date('2026-06-04T00:05:00.000Z');
const completedAt = new Date('2026-06-04T00:04:00.000Z');
const publishedAt = new Date('2026-06-03T00:00:00.000Z');

const DEFAULT_AI_TIMEOUTS = {
  getAnswerTimeoutMs() { return DEFAULT_OPENAI_ANSWER_TIMEOUT_MS; },
  getQueryRewriteTimeoutMs() { return DEFAULT_OPENAI_QUERY_REWRITE_TIMEOUT_MS; },
  getSuggestionTimeoutMs() { return DEFAULT_OPENAI_SUGGESTION_TIMEOUT_MS; },
};

function createTestAskService(aiMock, searchMock, threadsMock) {
  const aiService = new AiService({
    ...DEFAULT_AI_TIMEOUTS,
    async generateSuggestedFollowUpQuestions() {
      return [];
    },
    ...aiMock,
  });

  return new AskService(aiService, searchMock, threadsMock);
}

function delayWithAbort(ms, value, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(
        Object.assign(new Error('The operation was aborted'), {
          name: 'AbortError',
        }),
      );
    }

    const timer = setTimeout(() => resolve(value), ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(
          Object.assign(new Error('The operation was aborted'), {
            name: 'AbortError',
          }),
        );
      },
      { once: true },
    );
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

module.exports = {
  DEFAULT_AI_TIMEOUTS,
  citationId,
  completedAt,
  createCitationRecord,
  createdAt,
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
  updatedAt,
};
