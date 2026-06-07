const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const {
  OpenAiProviderService,
} = require('../src/ai/openai-provider.service.ts');
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
} = require('../src/ai/ai.constants.ts');

test('OpenAiProviderService fails clearly when OPENAI_API_KEY is missing', async () => {
  const service = new OpenAiProviderService({
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

test('OpenAiProviderService suggestion generation fails clearly when OPENAI_API_KEY is missing', async () => {
  const service = new OpenAiProviderService({
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

test('OpenAiProviderService uses the default model when OPENAI_MODEL is missing', () => {
  const service = new OpenAiProviderService({
    get(key) {
      if (key === OPENAI_API_KEY_CONFIG_KEY) {
        return 'test-api-key';
      }

      return undefined;
    },
  });

  assert.equal(service.getModel(), DEFAULT_OPENAI_MODEL);
});

test('OpenAiProviderService uses configured OPENAI_MODEL when present', () => {
  const model = 'gpt-test-model';
  const service = new OpenAiProviderService({
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

test('OpenAiProviderService uses the default utility model when OPENAI_UTILITY_MODEL is missing', () => {
  const model = 'gpt-answer-model';
  const service = new OpenAiProviderService({
    get(key) {
      if (key === OPENAI_MODEL_CONFIG_KEY) {
        return model;
      }

      return undefined;
    },
  });

  assert.equal(service.getUtilityModel(), DEFAULT_OPENAI_UTILITY_MODEL);
});

test('OpenAiProviderService uses configured OPENAI_UTILITY_MODEL when present', () => {
  const utilityModel = 'gpt-utility-model';
  const service = new OpenAiProviderService({
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

test('OpenAiProviderService uses default timeout config when optional env vars are missing', () => {
  const service = new OpenAiProviderService({
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

test('OpenAiProviderService fails clearly when timeout config is invalid', () => {
  const service = new OpenAiProviderService({
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
