const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const { HealthController } = require('../src/health.controller.ts');

test('HealthController reports liveness without querying the database', () => {
  let queryCount = 0;
  const controller = new HealthController({
    async $queryRaw() {
      queryCount += 1;
    },
  });

  assert.equal(controller.live().status, 'ok');
  assert.equal(queryCount, 0);
});

test('HealthController readiness confirms the database is reachable', async () => {
  const controller = new HealthController({
    async $queryRaw() {
      return [{ result: 1 }];
    },
  });

  assert.deepEqual((await controller.ready()).checks, { database: 'up' });
});

test('HealthController returns service unavailable when the database is down', async () => {
  const controller = new HealthController({
    async $queryRaw() {
      throw new Error('connection refused');
    },
  });

  await assert.rejects(
    () => controller.ready(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'Database readiness check failed',
  );
});
