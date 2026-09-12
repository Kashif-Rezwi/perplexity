const assert = require('node:assert/strict');
const { test } = require('node:test');
const { InternalServerErrorException } = require('@nestjs/common');
const { TurnStatus } = require('@prisma/client');
const {
  DEFAULT_AI_TIMEOUTS,
  createTestAskService,
  createThreadRecord,
  threadId,
  turnId,
} = require('./ask-test-helpers.js');

function createEmptyStreamAskService({ streamError }) {
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async *streamAnswer(input) {
        calls.push(['streamAnswer', input]);
        if (streamError) {
          throw streamError;
        }
      },
      async generateAnswer() {
        return 'Fallback answer';
      },
    },
    {
      async search(input) {
        calls.push(['search', input]);
        return [];
      },
    },
    {
      async createThreadWithPendingTurn(input) {
        calls.push(['createThreadWithPendingTurn', input]);
        return createThreadRecord({
          answerMarkdown: null,
          answerPreview: null,
          turnStatus: TurnStatus.PENDING,
          completedAt: null,
        });
      },
      async failTurn(input) {
        calls.push(['failTurn', input]);
      },
    },
  );

  return { calls, service };
}

async function collectEvents(service) {
  const stream = await service.askStream({ question: 'hi there?' });
  const events = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

test('AskService emits ANSWER_FAILED without deltas when the AI stream completes empty', async () => {
  const { calls, service } = createEmptyStreamAskService({});

  const events = await collectEvents(service);

  assert.deepEqual(events.map((event) => event.event), [
    'start',
    'progress',
    'progress',
    'progress',
    'error',
    'done',
  ]);
  assert.deepEqual(events.filter((event) => event.event === 'delta'), []);
  assert.equal(events.some((event) => event.event === 'final'), false);
  assert.deepEqual(events[4].data, {
    message: 'AI returned an empty answer',
    code: 'ANSWER_FAILED',
    retryable: true,
  });
  assert.deepEqual(
    calls.filter(([name]) => name === 'failTurn'),
    [
      [
        'failTurn',
        {
          threadId,
          turnId,
          errorMessage: 'AI returned an empty answer',
        },
      ],
    ],
  );
});

test('AskService propagates the AI empty-answer failure into the SSE error event', async () => {
  const error = new InternalServerErrorException('AI returned an empty answer');
  const { calls, service } = createEmptyStreamAskService({ streamError: error });

  const events = await collectEvents(service);

  assert.deepEqual(events[4].data, {
    message: 'AI returned an empty answer',
    code: 'ANSWER_FAILED',
    retryable: true,
  });
  assert.deepEqual(
    calls.filter(([name]) => name === 'failTurn'),
    [
      [
        'failTurn',
        {
          threadId,
          turnId,
          errorMessage: 'AI returned an empty answer',
        },
      ],
    ],
  );
});