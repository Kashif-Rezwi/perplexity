const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');

// The `ai` SDK exposes getter-only, non-configurable exports, so properties
// cannot be monkey-patched. Replace the whole require.cache entry BEFORE the
// AiService module tree loads so the SDK util calls our spy instead.
const mockAiExports = { generateText: null };
const resolvedAiPath = require.resolve('ai');
require.cache[resolvedAiPath] = {
  id: resolvedAiPath,
  filename: resolvedAiPath,
  loaded: true,
  exports: mockAiExports,
};

const { AiService } = require('../src/ai/ai.service.ts');
const {
  AI_ANSWER_TIMEOUT_MS_CONFIG_KEY,
  AI_API_KEY_CONFIG_KEY,
  AI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY,
  AI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY,
  DEFAULT_AI_ANSWER_TIMEOUT_MS,
  DEFAULT_AI_QUERY_REWRITE_TIMEOUT_MS,
  DEFAULT_AI_SUGGESTION_TIMEOUT_MS,
} = require('../src/ai/ai.constants.ts');

const VALID_API_KEY = 'test-ai-key';

function makeConfig(overrides = {}) {
  return {
    get(key) {
      return overrides[key];
    },
  };
}

test('AiService constructor does not require AI_API_KEY eagerly', () => {
  assert.doesNotThrow(
    () => new AiService(makeConfig({ [AI_API_KEY_CONFIG_KEY]: VALID_API_KEY })),
  );
  assert.doesNotThrow(() => new AiService(makeConfig()));
});

test('AiService fails clearly when used without AI_API_KEY', async () => {
  const service = new AiService(makeConfig());

  await assert.rejects(
    () => service.generateAnswer('Explain Prisma', [], []),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'AI_API_KEY is not configured',
  );
});

test('AiService timeout getters throw when timeout config is invalid', () => {
  const invalidTimeouts = [
    [AI_ANSWER_TIMEOUT_MS_CONFIG_KEY, 'getAnswerTimeoutMs'],
    [AI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY, 'getQueryRewriteTimeoutMs'],
    [AI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY, 'getSuggestionTimeoutMs'],
  ];

  for (const [key, method] of invalidTimeouts) {
    assert.throws(
      () =>
        new AiService(
          makeConfig({
            [AI_API_KEY_CONFIG_KEY]: VALID_API_KEY,
            [key]: '0',
          }),
        )[method](),
      (error) =>
        error instanceof ServiceUnavailableException &&
        error.message === `${key} must be a positive integer`,
    );
  }
});

test('AiService uses default timeouts when env vars are absent', () => {
  const service = new AiService(
    makeConfig({ [AI_API_KEY_CONFIG_KEY]: VALID_API_KEY }),
  );

  assert.equal(service.getAnswerTimeoutMs(), DEFAULT_AI_ANSWER_TIMEOUT_MS);
  assert.equal(
    service.getQueryRewriteTimeoutMs(),
    DEFAULT_AI_QUERY_REWRITE_TIMEOUT_MS,
  );
  assert.equal(
    service.getSuggestionTimeoutMs(),
    DEFAULT_AI_SUGGESTION_TIMEOUT_MS,
  );
});

test('AiService uses configured timeout values when present', () => {
  const service = new AiService(
    makeConfig({
      [AI_API_KEY_CONFIG_KEY]: VALID_API_KEY,
      [AI_ANSWER_TIMEOUT_MS_CONFIG_KEY]: '20000',
      [AI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY]: '4000',
      [AI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY]: '12000',
    }),
  );

  assert.equal(service.getAnswerTimeoutMs(), 20000);
  assert.equal(service.getQueryRewriteTimeoutMs(), 4000);
  assert.equal(service.getSuggestionTimeoutMs(), 12000);
});

test('AiService returns the question unchanged when there is nothing to rewrite', async () => {
  const generateTextCalls = [];
  mockAiExports.generateText = async (options) => {
    generateTextCalls.push(options);
    return { text: 'should never be reached' };
  };

  const service = new AiService(
    makeConfig({ [AI_API_KEY_CONFIG_KEY]: VALID_API_KEY }),
  );

  const searchQuery = await service.resolveSearchQuery('What is Prisma?', []);

  assert.equal(searchQuery, 'What is Prisma?');
  assert.deepEqual(generateTextCalls, []);
});

test('AiService rewrites follow-up questions using truncated thread context', async () => {
  const longAnswer = 'x'.repeat(400);
  const generateTextCalls = [];
  mockAiExports.generateText = async () => {
    generateTextCalls.push(true);
    return { text: 'prisma standalone query' };
  };

  const service = new AiService(
    makeConfig({ [AI_API_KEY_CONFIG_KEY]: VALID_API_KEY }),
  );

  const searchQuery = await service.resolveSearchQuery('And pricing?', [
    { question: 'Prior question 1', answerMarkdown: 'Prior answer 1' },
    { question: 'Prior question 2', answerMarkdown: 'Prior answer 2' },
    { question: 'Prior question 3', answerMarkdown: longAnswer },
    { question: 'Prior question 4', answerMarkdown: 'Prior answer 4' },
  ], 'Thread title');

  assert.equal(searchQuery, 'prisma standalone query');
  assert.equal(generateTextCalls.length, 1);
});

test('AiService falls back to the raw question when rewrite fails', async () => {
  mockAiExports.generateText = async () => {
    throw new Error('upstream down');
  };

  const service = new AiService(
    makeConfig({ [AI_API_KEY_CONFIG_KEY]: VALID_API_KEY }),
  );

  const searchQuery = await service.resolveSearchQuery('And pricing?', [
    { question: 'Prior question', answerMarkdown: 'Prior answer' },
  ]);

  assert.equal(searchQuery, 'And pricing?');
});


