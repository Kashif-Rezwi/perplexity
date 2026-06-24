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
  return mapPriorTurns(thread.turns);
}

export function getPriorTurnsBeforeTurn(
  thread: ThreadDetailRecord,
  turnId: string,
): PriorTurn[] {
  const turnIndex = thread.turns.findIndex((turn) => turn.id === turnId);
  const turns = turnIndex === -1 ? thread.turns : thread.turns.slice(0, turnIndex);

  return mapPriorTurns(turns);
}

function mapPriorTurns(turns: ThreadDetailRecord['turns']): PriorTurn[] {
  return turns
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
