const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const { withTimeout } = require('../src/common/utils/with-timeout.util.ts');

function delay(ms, value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

test('withTimeout resolves when the operation finishes in time', async () => {
  await assert.doesNotReject(async () => {
    const result = await withTimeout(
      Promise.resolve('done'),
      50,
      () => new Error('timed out'),
    );

    assert.equal(result, 'done');
  });
});

test('withTimeout rejects with the original error when the operation fails', async () => {
  const originalError = new Error('provider failed');

  await assert.rejects(
    () =>
      withTimeout(
        Promise.reject(originalError),
        50,
        () => new Error('timed out'),
      ),
    (error) => error === originalError,
  );
});

test('withTimeout rejects with the timeout error when the operation is slow', async () => {
  let didTimeout = false;

  await assert.rejects(
    () =>
      withTimeout(
        delay(25, 'late'),
        1,
        () => new ServiceUnavailableException('provider timed out'),
        () => {
          didTimeout = true;
        },
      ),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'provider timed out',
  );

  assert.equal(didTimeout, true);
});
