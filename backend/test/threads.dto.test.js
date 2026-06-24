const assert = require('node:assert/strict');
const { test } = require('node:test');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const {
  BulkDeleteThreadsDto,
} = require('../src/threads/dto/bulk-delete-threads.dto.ts');
const {
  PinnedThreadListQueryDto,
} = require('../src/threads/dto/pinned-thread-list-query.dto.ts');

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

test('PinnedThreadListQueryDto accepts only bounded numeric limits', async () => {
  const dto = plainToInstance(PinnedThreadListQueryDto, {
    limit: '50',
    cursor: threadId,
  });

  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  assert.equal(dto.limit, 50);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].property, 'cursor');
});
