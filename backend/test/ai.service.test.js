const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const { AiService } = require('../src/ai/ai.service.ts');
const { AI_PROVIDER_CONFIG_KEY } = require('../src/ai/ai.constants.ts');

function makeConfig(provider) {
  return {
    get(key) {
      return key === AI_PROVIDER_CONFIG_KEY ? provider : undefined;
    },
  };
}

function makeProvider(name, calls) {
  return {
    getAnswerTimeoutMs() {
      return 1000;
    },
    getQueryRewriteTimeoutMs() {
      return 1000;
    },
    getSuggestionTimeoutMs() {
      return 1000;
    },
    async generateAnswer(input) {
      calls.push([name, 'generateAnswer', input]);
      return `${name} answer`;
    },
    async *streamAnswer(input) {
      calls.push([name, 'streamAnswer', input]);
      yield `${name} stream`;
    },
    async generateStandaloneSearchQuery(input) {
      calls.push([name, 'generateStandaloneSearchQuery', input]);
      return `${name} query`;
    },
    async generateSuggestedFollowUpQuestions(input) {
      calls.push([name, 'generateSuggestedFollowUpQuestions', input]);
      return [`${name} follow up?`];
    },
  };
}

test('AiService uses OpenAI when AI_PROVIDER is absent', async () => {
  const calls = [];
  const service = new AiService(
    makeProvider('openai', calls),
    makeConfig(undefined),
    makeProvider('groq', calls),
  );

  const response = await service.generateAnswer('What is Prisma?', [], []);

  assert.equal(response, 'openai answer');
  assert.deepEqual(calls.map(([provider]) => provider), ['openai']);
});

test('AiService uses Groq when AI_PROVIDER is groq', async () => {
  const calls = [];
  const service = new AiService(
    makeProvider('openai', calls),
    makeConfig('groq'),
    makeProvider('groq', calls),
  );

  const response = await service.generateAnswer('What is Prisma?', [], []);

  assert.equal(response, 'groq answer');
  assert.deepEqual(calls.map(([provider]) => provider), ['groq']);
});

test('AiService rejects unsupported AI_PROVIDER values', async () => {
  const service = new AiService(
    makeProvider('openai', []),
    makeConfig('anthropic'),
    makeProvider('groq', []),
  );

  await assert.rejects(
    () => service.generateAnswer('What is Prisma?', [], []),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'AI_PROVIDER must be one of: openai, groq',
  );
});
