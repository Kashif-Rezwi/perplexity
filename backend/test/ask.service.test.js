const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const { AskService } = require('../dist/src/ask/ask.service.js');
const { AiService } = require('../dist/src/ai/ai.service.js');
const {
  DEFAULT_OPENAI_MODEL,
  OPENAI_API_KEY_CONFIG_KEY,
  OPENAI_MODEL_CONFIG_KEY,
} = require('../dist/src/ai/ai.constants.js');

test('AskService returns answerMarkdown from the AI service', async () => {
  const service = new AskService({
    async generateAnswer() {
      return 'Prisma relations connect records across tables.';
    },
  });

  assert.deepEqual(await service.ask({ question: 'Explain Prisma relations' }), {
    answerMarkdown: 'Prisma relations connect records across tables.',
  });
});

test('AskService passes the exact question to the AI service', async () => {
  let receivedQuestion;
  const question = 'Explain Prisma relations simply';
  const service = new AskService({
    async generateAnswer(input) {
      receivedQuestion = input;
      return 'Done.';
    },
  });

  await service.ask({ question });

  assert.equal(receivedQuestion, question);
});

test('AiService fails clearly when OPENAI_API_KEY is missing', async () => {
  const service = new AiService({
    get() {
      return undefined;
    },
  });

  await assert.rejects(
    () => service.generateAnswer('Explain Prisma relations'),
    (error) =>
      error instanceof ServiceUnavailableException &&
      error.message === 'OPENAI_API_KEY is not configured',
  );
});

test('AiService uses the default model when OPENAI_MODEL is missing', () => {
  const service = new AiService({
    get(key) {
      if (key === OPENAI_API_KEY_CONFIG_KEY) {
        return 'test-api-key';
      }

      return undefined;
    },
  });

  assert.equal(service.getModel(), DEFAULT_OPENAI_MODEL);
});

test('AiService uses configured OPENAI_MODEL when present', () => {
  const model = 'gpt-test-model';
  const service = new AiService({
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
