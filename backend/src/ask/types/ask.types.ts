import type { ThreadSummaryItem, TurnItem } from '../../threads/types/thread.types';

export type AskInput = {
  question: string;
  threadId?: string;
};

export type AskResponse = {
  thread: ThreadSummaryItem;
  turn: TurnItem;
};
