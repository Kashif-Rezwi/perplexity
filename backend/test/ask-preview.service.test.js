const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NotFoundException, ServiceUnavailableException } = require('@nestjs/common');
const { TurnStatus } = require('@prisma/client');
const {
  DEFAULT_AI_TIMEOUTS,
  citationId,
  createCitationRecord,
  createPriorCompletedTurns,
  createSourceRecord,
  createTestAskService,
  createThreadRecord,
  createTurnRecord,
  delayWithAbort,
  followUpTurnId,
  publishedAt,
  sourceId,
  threadId,
  turnId,
} = require('./ask-test-helpers.js');

test('AskService strips markdown from answerPreview before truncation', async () => {
  const answerMarkdown = 'Here is **bold** and _italic_ and a [link](https://example.com) with some `code` and \n\nnewlines.';
  const strippedPreview = 'Here is bold and italic and a link with some code and newlines.';
  
  const calls = [];
  const service = createTestAskService(
    {
      ...DEFAULT_AI_TIMEOUTS,
      async generateAnswer() { return answerMarkdown; }
    },
    {
      async search() { return []; }
    },
    {
      async createThreadWithPendingTurn(input) {
        calls.push(['createThreadWithPendingTurn', input]);
        return createThreadRecord({ answerMarkdown: null, turnStatus: TurnStatus.PENDING, completedAt: null });
      },
      async completeTurn(input) {
        calls.push(['completeTurn', input]);
      },
      async findThreadDetailById(id) {
        return createThreadRecord({ answerMarkdown: null });
      },
      async findThreadWithSingleTurn(id, tId) {
        return {
          thread: createThreadRecord({ turns: Array.from({ length: 1 }) }),
          turn: createTurnRecord({ answerMarkdown, suggestedFollowUpQuestions: [], sources: [], citations: [] }),
          totalSourceCount: 0,
        };
      }
    }
  );

  await service.ask({ question: 'Test question' });
  const completeTurnCall = calls.find(c => c[0] === 'completeTurn');
  assert.equal(completeTurnCall[1].answerPreview, strippedPreview);
});
