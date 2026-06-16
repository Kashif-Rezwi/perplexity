const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const {
  GroqProviderService,
} = require('../src/ai/groq-provider.service.ts');
const {
  DEFAULT_GROQ_ANSWER_TIMEOUT_MS,
  DEFAULT_GROQ_QUERY_REWRITE_TIMEOUT_MS,
  DEFAULT_GROQ_SUGGESTION_TIMEOUT_MS,
  GROQ_API_KEY_CONFIG_KEY,
  GROQ_ANSWER_TIMEOUT_MS_CONFIG_KEY,
  GROQ_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY,
  GROQ_SUGGESTION_TIMEOUT_MS_CONFIG_KEY,
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
const VALID_API_KEY = 'gsk-test-key';

test('GroqProviderService constructor throws when GROQ_API_KEY is missing', () => {
  assert.throws(
    () => new GroqProviderService(makeConfig()),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'GROQ_API_KEY is not configured',
  );
});

test('GroqProviderService constructor throws when timeout config is invalid', () => {
  assert.throws(
    () =>
      new GroqProviderService(
        makeConfig({
          [GROQ_API_KEY_CONFIG_KEY]: VALID_API_KEY,
          [GROQ_ANSWER_TIMEOUT_MS_CONFIG_KEY]: '0',
        }),
      ),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'GROQ_ANSWER_TIMEOUT_MS must be a positive integer',
  );

  assert.throws(
    () =>
      new GroqProviderService(
        makeConfig({
          [GROQ_API_KEY_CONFIG_KEY]: VALID_API_KEY,
          [GROQ_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY]: 'not-a-number',
        }),
      ),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message ===
        'GROQ_QUERY_REWRITE_TIMEOUT_MS must be a positive integer',
  );

  assert.throws(
    () =>
      new GroqProviderService(
        makeConfig({
          [GROQ_API_KEY_CONFIG_KEY]: VALID_API_KEY,
          [GROQ_SUGGESTION_TIMEOUT_MS_CONFIG_KEY]: '-10',
        }),
      ),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message ===
        'GROQ_SUGGESTION_TIMEOUT_MS must be a positive integer',
  );
});

test('GroqProviderService uses default timeouts when env vars are absent', () => {
  const service = new GroqProviderService(
    makeConfig({ [GROQ_API_KEY_CONFIG_KEY]: VALID_API_KEY }),
  );

  assert.equal(service.getAnswerTimeoutMs(), DEFAULT_GROQ_ANSWER_TIMEOUT_MS);
  assert.equal(service.getQueryRewriteTimeoutMs(), DEFAULT_GROQ_QUERY_REWRITE_TIMEOUT_MS);
  assert.equal(service.getSuggestionTimeoutMs(), DEFAULT_GROQ_SUGGESTION_TIMEOUT_MS);
});

test('GroqProviderService uses configured timeout values when present', () => {
  const service = new GroqProviderService(
    makeConfig({
      [GROQ_API_KEY_CONFIG_KEY]: VALID_API_KEY,
      [GROQ_ANSWER_TIMEOUT_MS_CONFIG_KEY]: '20000',
      [GROQ_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY]: '4000',
      [GROQ_SUGGESTION_TIMEOUT_MS_CONFIG_KEY]: '12000',
    }),
  );

  assert.equal(service.getAnswerTimeoutMs(), 20000);
  assert.equal(service.getQueryRewriteTimeoutMs(), 4000);
  assert.equal(service.getSuggestionTimeoutMs(), 12000);
});
