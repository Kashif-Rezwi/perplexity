const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  validateEnvironment,
} = require('../src/config/environment.ts');

function validEnvironment(overrides = {}) {
  return {
    DATABASE_URL: 'postgresql://user:password@localhost:5432/perplexity',
    TAVILY_API_KEY: 'test-tavily-key',
    AI_PROVIDER: 'openai',
    OPENAI_API_KEY: 'sk-test-key',
    ...overrides,
  };
}

test('validateEnvironment applies typed runtime defaults', () => {
  const environment = validateEnvironment(validEnvironment());

  assert.equal(environment.NODE_ENV, 'development');
  assert.equal(environment.HOST, '0.0.0.0');
  assert.equal(environment.PORT, 8080);
  assert.equal(environment.TRUST_PROXY, false);
  assert.equal(environment.CORS_ORIGINS, 'http://localhost:3001');
});

test('validateEnvironment requires the selected AI provider key', () => {
  assert.throws(
    () =>
      validateEnvironment(
        validEnvironment({
          AI_PROVIDER: 'groq',
          OPENAI_API_KEY: undefined,
        }),
      ),
    /GROQ_API_KEY is required/,
  );
});

test('validateEnvironment rejects wildcard CORS', () => {
  assert.throws(
    () => validateEnvironment(validEnvironment({ CORS_ORIGINS: '*' })),
    /wildcard CORS is disabled/,
  );
});

test('validateEnvironment rejects non-PostgreSQL database URLs', () => {
  assert.throws(
    () =>
      validateEnvironment(
        validEnvironment({ DATABASE_URL: 'https://database.example.com' }),
      ),
    /must use the postgresql:\/\/ or postgres:\/\/ protocol/,
  );
});

test('validateEnvironment rejects an invalid Tavily search depth', () => {
  assert.throws(
    () =>
      validateEnvironment(
        validEnvironment({ TAVILY_SEARCH_DEPTH: 'maximum' }),
      ),
    /TAVILY_SEARCH_DEPTH must be one of/,
  );
});
