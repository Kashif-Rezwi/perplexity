const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const {
  GroqProviderService,
} = require('../src/ai/groq-provider.service.ts');
const {
  DEFAULT_GROQ_ANSWER_TIMEOUT_MS,
  DEFAULT_GROQ_MODEL,
  DEFAULT_GROQ_QUERY_REWRITE_TIMEOUT_MS,
  DEFAULT_GROQ_SUGGESTION_TIMEOUT_MS,
  DEFAULT_GROQ_UTILITY_MODEL,
  GROQ_API_KEY_CONFIG_KEY,
  GROQ_ANSWER_TIMEOUT_MS_CONFIG_KEY,
  GROQ_MODEL_CONFIG_KEY,
  GROQ_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY,
  GROQ_SUGGESTION_TIMEOUT_MS_CONFIG_KEY,
  GROQ_UTILITY_MODEL_CONFIG_KEY,
} = require('../src/ai/ai.constants.ts');

test('GroqProviderService fails clearly when GROQ_API_KEY is missing', async () => {
  const service = new GroqProviderService({
    get() {
      return undefined;
    },
  });

  await assert.rejects(
    () => service.generateAnswer({ question: 'Explain Prisma relations' }),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'GROQ_API_KEY is not configured',
  );
});

test('GroqProviderService suggestion generation fails clearly when GROQ_API_KEY is missing', async () => {
  const service = new GroqProviderService({
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
      error.message === 'GROQ_API_KEY is not configured',
  );
});

test('GroqProviderService uses the default model when GROQ_MODEL is missing', () => {
  const service = new GroqProviderService({
    get(key) {
      if (key === GROQ_API_KEY_CONFIG_KEY) {
        return 'test-api-key';
      }

      return undefined;
    },
  });

  assert.equal(service.getModel(), DEFAULT_GROQ_MODEL);
});

test('GroqProviderService uses configured GROQ_MODEL when present', () => {
  const model = 'llama-test-model';
  const service = new GroqProviderService({
    get(key) {
      if (key === GROQ_API_KEY_CONFIG_KEY) {
        return 'test-api-key';
      }

      if (key === GROQ_MODEL_CONFIG_KEY) {
        return model;
      }

      return undefined;
    },
  });

  assert.equal(service.getModel(), model);
});

test('GroqProviderService uses the default utility model when GROQ_UTILITY_MODEL is missing', () => {
  const model = 'llama-answer-model';
  const service = new GroqProviderService({
    get(key) {
      if (key === GROQ_MODEL_CONFIG_KEY) {
        return model;
      }

      return undefined;
    },
  });

  assert.equal(service.getUtilityModel(), DEFAULT_GROQ_UTILITY_MODEL);
});

test('GroqProviderService uses configured GROQ_UTILITY_MODEL when present', () => {
  const utilityModel = 'llama-utility-model';
  const service = new GroqProviderService({
    get(key) {
      if (key === GROQ_MODEL_CONFIG_KEY) {
        return 'llama-answer-model';
      }

      if (key === GROQ_UTILITY_MODEL_CONFIG_KEY) {
        return utilityModel;
      }

      return undefined;
    },
  });

  assert.equal(service.getUtilityModel(), utilityModel);
});

test('GroqProviderService uses default timeout config when optional env vars are missing', () => {
  const service = new GroqProviderService({
    get() {
      return undefined;
    },
  });

  assert.equal(service.getAnswerTimeoutMs(), DEFAULT_GROQ_ANSWER_TIMEOUT_MS);
  assert.equal(
    service.getQueryRewriteTimeoutMs(),
    DEFAULT_GROQ_QUERY_REWRITE_TIMEOUT_MS,
  );
  assert.equal(
    service.getSuggestionTimeoutMs(),
    DEFAULT_GROQ_SUGGESTION_TIMEOUT_MS,
  );
});

test('GroqProviderService fails clearly when timeout config is invalid', () => {
  const service = new GroqProviderService({
    get(key) {
      if (key === GROQ_ANSWER_TIMEOUT_MS_CONFIG_KEY) {
        return '0';
      }

      if (key === GROQ_QUERY_REWRITE_TIMEOUT_MS_CONFIG_KEY) {
        return 'not-a-number';
      }

      if (key === GROQ_SUGGESTION_TIMEOUT_MS_CONFIG_KEY) {
        return '-10';
      }

      return undefined;
    },
  });

  assert.throws(
    () => service.getAnswerTimeoutMs(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'GROQ_ANSWER_TIMEOUT_MS must be a positive integer',
  );
  assert.throws(
    () => service.getQueryRewriteTimeoutMs(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message ===
        'GROQ_QUERY_REWRITE_TIMEOUT_MS must be a positive integer',
  );
  assert.throws(
    () => service.getSuggestionTimeoutMs(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message ===
        'GROQ_SUGGESTION_TIMEOUT_MS must be a positive integer',
  );
});
