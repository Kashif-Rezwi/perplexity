import type { AskResponse } from './ask.types';

export type AskStreamStartEvent = {
  event: 'start';
  data: {
    threadId: string;
    turnId: string;
    question: string;
    searchQuery: string;
  };
};

export type AskStreamDeltaEvent = {
  event: 'delta';
  data: {
    text: string;
  };
};

export type AskStreamFinalEvent = {
  event: 'final';
  data: AskResponse;
};

export type AskStreamErrorEvent = {
  event: 'error';
  data: {
    message: string;
  };
};

export type AskStreamDoneEvent = {
  event: 'done';
  data: Record<string, never>;
};

export type AskStreamEvent =
  | AskStreamStartEvent
  | AskStreamDeltaEvent
  | AskStreamFinalEvent
  | AskStreamErrorEvent
  | AskStreamDoneEvent;
