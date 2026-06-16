import { InternalServerErrorException } from '@nestjs/common';
import { TurnStatus } from '@prisma/client';
import type { PriorTurn } from '../../ai/types/ai.types';
import type { ThreadDetailRecord } from '../../threads/types/threads.types';

const PRIOR_TURN_CONTEXT_LIMIT = 5;

export function getLatestTurn(thread: { turns: { id: string }[] }): { id: string } {
  const turn = thread.turns[thread.turns.length - 1];

  if (!turn) {
    throw new InternalServerErrorException('Thread was created without a turn');
  }

  return turn;
}

export function getPriorTurns(thread: ThreadDetailRecord): PriorTurn[] {
  return thread.turns
    .filter(
      (turn) =>
        turn.status === TurnStatus.COMPLETED && turn.answerMarkdown !== null,
    )
    .slice(-PRIOR_TURN_CONTEXT_LIMIT)
    .map((turn) => ({
      question: turn.question,
      answerMarkdown: turn.answerMarkdown as string,
    }));
}
