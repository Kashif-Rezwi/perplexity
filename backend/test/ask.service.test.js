const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const { AskService } = require('../dist/src/ask/ask.service.js');
const { aiService } = require('../dist/src/ai/ai.service.js');

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

test('aiService fails clearly when OPENAI_API_KEY is missing', async () => {
  const service = new aiService({
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
