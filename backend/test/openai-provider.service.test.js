const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const {
  OpenAiProviderService,
} = require('../src/ai/openai-provider.service.ts');
const {
  DEFAULT_OPENAI_ANSWER_TIMEOUT_MS,
  DEFAULT_OPENAI_QUERY_REWRITE_TIMEOUT_MS,
  DEFAULT_OPENAI_SUGGESTION_TIMEOUT_MS,
  OPENAI_API_KEY_CONFIG_KEY,
  OPENAI_ANSWER_TIMEOUT_MS_CONFIG_KEY,
  OPENAI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY,
  OPENAI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY,
} = require('../src/ai/ai.constants.ts');

// Helper: build a minimal ConfigService stub.
function makeConfig(overrides = {}) {
  return {
    get(key) {
      return overrides[key];
    },
  };
}

// A valid API key to use whenever we need construction to succeed.
const VALID_API_KEY = 'sk-test-key';

test('OpenAiProviderService constructor does not require OPENAI_API_KEY eagerly', () => {
  assert.doesNotThrow(() => new OpenAiProviderService(makeConfig()));
});

test('OpenAiProviderService fails clearly when used without OPENAI_API_KEY', async () => {
  const service = new OpenAiProviderService(makeConfig());

  await assert.rejects(
    () => service.generateAnswer({ question: 'Explain Prisma' }),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'OPENAI_API_KEY is not configured',
  );
});

test('OpenAiProviderService timeout getters throw when timeout config is invalid', () => {
  assert.throws(
    () =>
      new OpenAiProviderService(
        makeConfig({
          [OPENAI_API_KEY_CONFIG_KEY]: VALID_API_KEY,
          [OPENAI_ANSWER_TIMEOUT_MS_CONFIG_KEY]: '0',
        }),
      ).getAnswerTimeoutMs(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'OPENAI_ANSWER_TIMEOUT_MS must be a positive integer',
  );

  assert.throws(
    () =>
      new OpenAiProviderService(
        makeConfig({
          [OPENAI_API_KEY_CONFIG_KEY]: VALID_API_KEY,
          [OPENAI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY]: 'not-a-number',
        }),
      ).getQueryRewriteTimeoutMs(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message ===
        'OPENAI_QUERY_REWRITE_TIMEOUT_MS must be a positive integer',
  );

  assert.throws(
    () =>
      new OpenAiProviderService(
        makeConfig({
          [OPENAI_API_KEY_CONFIG_KEY]: VALID_API_KEY,
          [OPENAI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY]: '-10',
        }),
      ).getSuggestionTimeoutMs(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message ===
        'OPENAI_SUGGESTION_TIMEOUT_MS must be a positive integer',
  );
});

test('OpenAiProviderService uses default timeouts when env vars are absent', () => {
  const service = new OpenAiProviderService(
    makeConfig({ [OPENAI_API_KEY_CONFIG_KEY]: VALID_API_KEY }),
  );

  assert.equal(service.getAnswerTimeoutMs(), DEFAULT_OPENAI_ANSWER_TIMEOUT_MS);
  assert.equal(service.getQueryRewriteTimeoutMs(), DEFAULT_OPENAI_QUERY_REWRITE_TIMEOUT_MS);
  assert.equal(service.getSuggestionTimeoutMs(), DEFAULT_OPENAI_SUGGESTION_TIMEOUT_MS);
});

test('OpenAiProviderService uses configured timeout values when present', () => {
  const service = new OpenAiProviderService(
    makeConfig({
      [OPENAI_API_KEY_CONFIG_KEY]: VALID_API_KEY,
      [OPENAI_ANSWER_TIMEOUT_MS_CONFIG_KEY]: '20000',
      [OPENAI_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY]: '4000',
      [OPENAI_SUGGESTION_TIMEOUT_MS_CONFIG_KEY]: '12000',
    }),
  );

  assert.equal(service.getAnswerTimeoutMs(), 20000);
  assert.equal(service.getQueryRewriteTimeoutMs(), 4000);
  assert.equal(service.getSuggestionTimeoutMs(), 12000);
});
