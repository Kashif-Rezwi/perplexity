const assert = require('node:assert/strict');
const { test } = require('node:test');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const {
  BulkDeleteThreadsDto,
} = require('../src/threads/dto/bulk-delete-threads.dto.ts');

const threadId = '11111111-1111-4111-8111-111111111111';

test('BulkDeleteThreadsDto trims and de-dupes valid thread ids', async () => {
  const dto = plainToInstance(BulkDeleteThreadsDto, {
    threadIds: [` ${threadId} `, threadId],
  });

  const errors = await validate(dto);

  assert.deepEqual(errors, []);
  assert.deepEqual(dto.threadIds, [threadId]);
});

test('BulkDeleteThreadsDto rejects non-string thread ids instead of dropping them', async () => {
  const dto = plainToInstance(BulkDeleteThreadsDto, {
    threadIds: [threadId, 123],
  });

  const errors = await validate(dto);

  assert.equal(errors.length, 1);
});
