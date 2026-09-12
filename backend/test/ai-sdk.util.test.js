const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  InternalServerErrorException,
  ServiceUnavailableException,
} = require('@nestjs/common');

// The `ai` SDK exposes getter-only, non-configurable exports, so properties
// cannot be monkey-patched. Instead we replace the whole require.cache entry
// with our own mutable module object BEFORE the util is loaded. The util
// compiles to `ai_1.streamText(...)` (property read at call time), so mutating
// this object's properties per test controls which streamText/generateText it
// sees. The leftover `null` defaults fail loudly when a test forgets to set a
// mock.
const mockAiExports = { streamText: null, generateText: null };
const resolvedAiPath = require.resolve('ai');
require.cache[resolvedAiPath] = {
  id: resolvedAiPath,
  filename: resolvedAiPath,
  loaded: true,
  exports: mockAiExports,
};

const {
  generateAnswer,
  streamAnswer,
} = require('../src/ai/utils/ai-sdk.util.ts');


const unansweredInput = {
  question: 'hi there?',
  priorTurns: [],
  sources: [],
};

function createLogger(calls = []) {
  return {
    error: (...args) => calls.push(args),
    warn: (...args) => calls.push(args),
  };
}

async function* fromParts(parts) {
  for (const part of parts) {
    yield part;
  }
}

function createStreamResult(parts) {
  return { fullStream: fromParts(parts) };
}

async function collectStream(stream) {
  const parts = [];
  for await (const part of stream) {
    parts.push(part);
  }
  return parts.join('');
}

function createAiCallOptions(loggerCalls = []) {
  return {
    model: 'mock-model',
    input: unansweredInput,
    logger: createLogger(loggerCalls),
    timeoutMs: 16000,
  };
}

test('streamAnswer streams text deltas and returns the concatenated answer', async () => {
  mockAiExports.streamText = () =>
    createStreamResult([
      { type: 'start' },
      { type: 'text-delta', text: 'Hello' },
      { type: 'text-delta', text: ' world' },
      { type: 'finish', finishReason: 'stop' },
    ]);
  const loggerCalls = [];

  const answer = await collectStream(
    streamAnswer(createAiCallOptions(loggerCalls)),
  );

  assert.equal(answer, 'Hello world');
  assert.deepEqual(loggerCalls, []);
});

test('streamAnswer reports a genuinely empty stream as an empty answer', async () => {
  mockAiExports.streamText = () =>
    createStreamResult([
      { type: 'start' },
      { type: 'finish', finishReason: 'stop' },
    ]);
  const loggerCalls = [];

  await assert.rejects(
    () => collectStream(streamAnswer(createAiCallOptions(loggerCalls))),
    (error) =>
      error instanceof InternalServerErrorException &&
      error.message === 'AI returned an empty answer',
  );
  assert.deepEqual(loggerCalls, []);
});

test('streamAnswer surfaces provider stream errors with the real reason instead of an empty answer', async () => {
  mockAiExports.streamText = () =>
    createStreamResult([
      { type: 'start' },
      {
        type: 'error',
        error: {
          type: 'billing_not_active',
          code: 'billing_not_active',
          message:
            'Your account is not active, please check your billing details on our website.',
        },
      },
      { type: 'finish', finishReason: 'error' },
    ]);
  const loggerCalls = [];

  await assert.rejects(
    () => collectStream(streamAnswer(createAiCallOptions(loggerCalls))),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message.includes('AI answer generation failed') &&
      error.message.includes('billing details on our website'),
  );
  assert.ok(
    loggerCalls.some(
      ([message]) =>
        message.includes('Your account is not active, please check your billing details on our website.'),
    ),
  );
});

test('streamAnswer unwraps SDK error envelopes to extract the real provider reason', async () => {
  mockAiExports.streamText = () =>
    createStreamResult([
      {
        type: 'error',
        sequence_number: 2,
        error: {
          type: 'billing_not_active',
          code: 'billing_not_active',
          message:
            'Your account is not active, please check your billing details on our website.',
          param: null,
        },
      },
    ]);
  const loggerCalls = [];

  await assert.rejects(
    () => collectStream(streamAnswer(createAiCallOptions(loggerCalls))),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message.includes('AI answer generation failed') &&
      error.message.includes('billing details on our website') &&
      !error.message.includes(': error'),
  );
  assert.ok(
    loggerCalls.some(
      ([message]) =>
        message.includes('Your account is not active, please check your billing details on our website.'),
    ),
  );
});

test('streamAnswer delivers text yielded before a provider stream error', async () => {
  mockAiExports.streamText = () =>
    createStreamResult([
      { type: 'text-delta', text: 'Partial' },
      { type: 'error', error: { code: 'server_error', message: 'Upstream exploded' } },
    ]);
  const loggerCalls = [];
  const stream = streamAnswer(createAiCallOptions(loggerCalls));

  const first = await stream[Symbol.asyncIterator]().next();
  assert.equal(first.value, 'Partial');

  await assert.rejects(
    () => stream[Symbol.asyncIterator]().next(),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'AI answer generation failed: Upstream exploded',
  );
});

test('streamAnswer reports content-filter finishes distinctly', async () => {
  mockAiExports.streamText = () =>
    createStreamResult([{ type: 'finish', finishReason: 'content-filter' }]);

  await assert.rejects(
    () => collectStream(streamAnswer(createAiCallOptions())),
    (error) =>
      error instanceof InternalServerErrorException &&
      error.message === 'AI response was blocked by the content filter',
  );
});

test('streamAnswer accepts legacy object finish reasons', async () => {
  mockAiExports.streamText = () =>
    createStreamResult([
      {
        type: 'finish',
        finishReason: { unified: 'content-filter', raw: 'content_filter' },
      },
    ]);

  await assert.rejects(
    () => collectStream(streamAnswer(createAiCallOptions())),
    (error) =>
      error instanceof InternalServerErrorException &&
      error.message === 'AI response was blocked by the content filter',
  );
});

test('streamAnswer reports length-truncated finishes distinctly', async () => {
  mockAiExports.streamText = () =>
    createStreamResult([{ type: 'finish', finishReason: 'length' }]);

  await assert.rejects(
    () => collectStream(streamAnswer(createAiCallOptions())),
    (error) =>
      error instanceof InternalServerErrorException &&
      error.message ===
        'AI answer was truncated before any content was generated',
  );
});

test('streamAnswer wraps thrown stream errors and logs the raw cause', async () => {
  mockAiExports.streamText = () => {
    throw new Error('socket hang up');
  };
  const loggerCalls = [];

  await assert.rejects(
    () => collectStream(streamAnswer(createAiCallOptions(loggerCalls))),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'AI answer streaming failed',
  );
  assert.ok(
    loggerCalls.some(([message]) => message.includes('socket hang up')),
  );
});

test('streamAnswer maps timeout errors to a dedicated exception', async () => {
  mockAiExports.streamText = () => {
    throw new Error('The request timed out after 16000ms');
  };
  const loggerCalls = [];

  await assert.rejects(
    () => collectStream(streamAnswer(createAiCallOptions(loggerCalls))),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'AI answer generation timed out',
  );
  assert.deepEqual(loggerCalls, []);
});

test('generateAnswer returns trimmed text on success', async () => {
  mockAiExports.generateText = async () => ({ text: '  Hello from the model.  ' });

  const answer = await generateAnswer(createAiCallOptions());

  assert.equal(answer, 'Hello from the model.');
});

test('generateAnswer reports blank model output as an empty answer', async () => {
  mockAiExports.generateText = async () => ({ text: '   ' });

  await assert.rejects(
    () => generateAnswer(createAiCallOptions()),
    (error) =>
      error instanceof InternalServerErrorException &&
      error.message === 'AI returned an empty answer',
  );
});

test('generateAnswer wraps unexpected errors and logs the root cause', async () => {
  mockAiExports.generateText = async () => {
    throw new Error('Your account is not active, please check your billing details on our website.');
  };
  const loggerCalls = [];

  await assert.rejects(
    () => generateAnswer(createAiCallOptions(loggerCalls)),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'AI answer generation failed',
  );
  assert.ok(
    loggerCalls.some(([message]) => message.includes('account is not active')),
  );
});