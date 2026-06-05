import type { ThreadSummaryItem, TurnItem } from '../../threads/types/thread.types';

export type AskInput = {
  question: string;
};

export type AskResponse = {
  thread: ThreadSummaryItem;
  turn: TurnItem;
};
