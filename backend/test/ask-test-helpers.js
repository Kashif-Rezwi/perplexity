const { ThreadMode, ThreadStatus, TurnStatus } = require('@prisma/client');
const { ServiceUnavailableException } = require('@nestjs/common');
const { AskService } = require('../src/ask/ask.service.ts');
const { withTimeout } = require('../src/common/utils/with-timeout.util.ts');
const { getErrorMessage } = require('../src/common/utils/error.util.ts');

const threadId = '11111111-1111-4111-8111-111111111111';
const turnId = '22222222-2222-4222-8222-222222222222';
const followUpTurnId = '55555555-5555-4555-8555-555555555555';
const sourceId = '33333333-3333-4333-8333-333333333333';
const citationId = '44444444-4444-4444-8444-444444444444';
const createdAt = new Date('2026-06-04T00:00:00.000Z');
const updatedAt = new Date('2026-06-04T00:05:00.000Z');
const completedAt = new Date('2026-06-04T00:04:00.000Z');
const publishedAt = new Date('2026-06-03T00:00:00.000Z');

// Generous fixed timeouts to avoid test timing dependencies.
const DEFAULT_AI_TIMEOUTS = {
  getAnswerTimeoutMs() { return 30_000; },
  getQueryRewriteTimeoutMs() { return 10_000; },
  getSuggestionTimeoutMs() { return 25_000; },
};

// Mirrors AiService's query-rewrite context truncation.
const QUERY_REWRITE_PRIOR_TURN_CONTEXT_LIMIT = 3;
const QUERY_REWRITE_ANSWER_CONTEXT_MAX_LENGTH = 300;

function getQueryRewritePriorTurns(priorTurns) {
  return (priorTurns ?? [])
    .slice(-QUERY_REWRITE_PRIOR_TURN_CONTEXT_LIMIT)
    .map((turn) => ({
      question: turn.question,
      answerMarkdown: truncateForQueryRewrite(turn.answerMarkdown),
    }));
}

function truncateForQueryRewrite(value) {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();

  return normalizedValue.length > QUERY_REWRITE_ANSWER_CONTEXT_MAX_LENGTH
    ? `${normalizedValue.slice(0, QUERY_REWRITE_ANSWER_CONTEXT_MAX_LENGTH)}...`
    : normalizedValue;
}

function createTestAskService(aiMock, searchMock, threadsMock) {
  // AiService exposes positional arguments to AskService and owns the
  // timeout/abort/fallback behavior internally, while the AI mocks in these
  // tests record the single-object provider call shape. This adapter emulates
  // the real AiService behavior between the two so the recorded calls stay
  // comparable.
  const timeouts = {};
  for (const key of [
    'getAnswerTimeoutMs',
    'getQueryRewriteTimeoutMs',
    'getSuggestionTimeoutMs',
  ]) {
    if (aiMock[key]) {
      timeouts[key] = aiMock[key];
    }
  }

  const aiService = {
    ...DEFAULT_AI_TIMEOUTS,
    ...timeouts,

    async resolveSearchQuery(question, priorTurns, threadTitle) {
      if (!aiMock.resolveSearchQuery) {
        return question;
      }

      const abortController = new AbortController();

      try {
        return await withTimeout(
          aiMock.resolveSearchQuery(
            {
              question,
              threadTitle,
              priorTurns: getQueryRewritePriorTurns(priorTurns),
            },
            abortController.signal,
          ),
          aiService.getQueryRewriteTimeoutMs(),
          () =>
            new ServiceUnavailableException(
              'AI search query rewrite timed out',
            ),
          () => abortController.abort(),
        );
      } catch (error) {
        aiFallbackLog(
          `Search query rewrite failed; falling back to raw question: ${getErrorMessage(error)}`,
        );
        return question;
      }
    },

    async generateAnswer(question, priorTurns, sources) {
      if (!aiMock.generateAnswer) {
        return 'Prisma relations connect rows.';
      }

      const abortController = new AbortController();

      return withTimeout(
        aiMock.generateAnswer(
          { question, priorTurns, sources },
          abortController.signal,
        ),
        aiService.getAnswerTimeoutMs(),
        () => new ServiceUnavailableException('AI answer generation timed out'),
        () => abortController.abort(),
      );
    },

    async *streamAnswer(question, priorTurns, sources, abortSignal) {
      if (aiMock.streamAnswer) {
        yield* aiMock.streamAnswer(
          { question, priorTurns, sources },
          abortSignal,
        );
        return;
      }

      yield await aiService.generateAnswer(question, priorTurns, sources);
    },

    async generateSuggestedFollowUpQuestions(
      question,
      answerMarkdown,
      priorTurns,
      sources,
      abortSignal,
    ) {
      if (!aiMock.generateSuggestedFollowUpQuestions) {
        return [];
      }

      const controller = new AbortController();

      try {
        return await withTimeout(
          aiMock.generateSuggestedFollowUpQuestions(
            { question, answerMarkdown, priorTurns, sources },
            controller.signal,
          ),
          aiService.getSuggestionTimeoutMs(),
          () =>
            new ServiceUnavailableException(
              'AI suggestion generation timed out',
            ),
          () => controller.abort(),
        );
      } catch (error) {
        aiFallbackLog(
          `Suggested follow-up generation failed; returning empty suggestions: ${getErrorMessage(error)}`,
        );
        return [];
      }
    },
  };

  return new AskService(aiService, searchMock, threadsMock);
}

function aiFallbackLog(message) {
  // Keep fallback warnings quiet in test output.
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
