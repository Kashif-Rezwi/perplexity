const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const {
  WebSearchService,
} = require('../dist/src/search/web-search.service.js');
const {
  DEFAULT_TAVILY_MAX_RESULTS,
  DEFAULT_TAVILY_SEARCH_DEPTH,
  DEFAULT_TAVILY_SEARCH_TIMEOUT_MS,
  TAVILY_API_KEY_CONFIG_KEY,
  TAVILY_SEARCH_TIMEOUT_MS_CONFIG_KEY,
} = require('../dist/src/search/search.constants.js');

test('WebSearchService fails clearly when TAVILY_API_KEY is missing', async () => {
  const service = new WebSearchService({
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

test('WebSearchService uses default search config when optional env vars are missing', () => {
  const service = new WebSearchService({
    get(key) {
      if (key === TAVILY_API_KEY_CONFIG_KEY) {
        return 'test-tavily-key';
      }

      return undefined;
    },
  });

  assert.equal(service.getMaxResults(), DEFAULT_TAVILY_MAX_RESULTS);
  assert.equal(service.getSearchDepth(), DEFAULT_TAVILY_SEARCH_DEPTH);
  assert.equal(service.getSearchTimeoutMs(), DEFAULT_TAVILY_SEARCH_TIMEOUT_MS);
});

test('WebSearchService fails clearly when timeout config is invalid', () => {
  const service = new WebSearchService({
    get(key) {
      if (key === TAVILY_SEARCH_TIMEOUT_MS_CONFIG_KEY) {
        return '0';
      }

      return undefined;
    },
  });

  assert.throws(
    () => service.getSearchTimeoutMs(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'TAVILY_SEARCH_TIMEOUT_MS must be a positive integer',
  );
});
