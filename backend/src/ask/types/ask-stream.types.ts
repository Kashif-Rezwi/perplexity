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

export type AskStreamProgressStage =
  | 'preparing'
  | 'searching'
  | 'answering'
  | 'saving'
  | 'completed';

export type AskStreamProgressEvent = {
  event: 'progress';
  data: {
    stage: AskStreamProgressStage;
    message: string;
  };
};

export type AskStreamFinalEvent = {
  event: 'final';
  data: AskResponse;
};

export type AskStreamErrorCode =
  | 'ASK_FAILED'
  | 'SEARCH_FAILED'
  | 'ANSWER_TIMEOUT'
  | 'ANSWER_FAILED'
  | 'SAVE_FAILED';

export type AskStreamErrorEvent = {
  event: 'error';
  data: {
    message: string;
    code: AskStreamErrorCode;
    retryable: boolean;
  };
};

export type AskStreamDoneEvent = {
  event: 'done';
  data: Record<string, never>;
};

export type AskStreamEvent =
  | AskStreamStartEvent
  | AskStreamDeltaEvent
  | AskStreamProgressEvent
  | AskStreamFinalEvent
  | AskStreamErrorEvent
  | AskStreamDoneEvent;
