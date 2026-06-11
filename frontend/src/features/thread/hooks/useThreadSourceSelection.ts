import { useState } from 'react';
import type { TurnItem } from '@/types/api.types';

type SourceTurnSelection = {
  threadId: string;
  turnId: string;
};

export function useThreadSourceSelection(threadId: string, turns: TurnItem[]) {
  const [selectedSourceTurn, setSelectedSourceTurn] =
    useState<SourceTurnSelection | null>(null);

  const latestTurn = turns[turns.length - 1];
  const selectedTurn =
    selectedSourceTurn?.threadId === threadId
      ? turns.find((turn) => turn.turnId === selectedSourceTurn.turnId) ||
        latestTurn
      : latestTurn;

  return {
    selectedTurn,
    selectSourceTurn: (turnId: string) => {
      setSelectedSourceTurn({ threadId, turnId });
    },
    clearSourceTurnSelection: () => {
      setSelectedSourceTurn(null);
    },
  };
}
