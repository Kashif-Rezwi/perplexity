import { ApiError, NetworkError, apiClient, getApiUrl } from './client';
import { createSseParser } from './sse';
import type {
  AskResponse,
  AskStreamHandlers,
  AskStreamErrorEvent,
  AskStreamProgressEvent,
  AskStreamStartEvent,
  BulkDeleteThreadsResponse,
  PinnedThreadListQueryInput,
  SourcesResponse,
  ThreadDetailResponse,
  ThreadListQueryInput,
  ThreadListResponse,
  ThreadSummaryItem,
} from '@/types/api.types';

export async function getThread(
  threadId: string,
): Promise<ThreadDetailResponse> {
  return apiClient<ThreadDetailResponse>(`/threads/${threadId}`);
}

export async function getThreads({
  limit,
  cursor,
  sort,
  mode,
  q,
  excludePinned,
}: ThreadListQueryInput = {}): Promise<ThreadListResponse> {
  const params = new URLSearchParams();

  if (limit) {
    params.set('limit', String(limit));
  }

  if (cursor) {
    params.set('cursor', cursor);
  }

  if (sort) {
    params.set('sort', sort);
  }

  if (mode) {
    params.set('mode', mode);
  }

  const trimmedQuery = q?.trim();
  if (trimmedQuery) {
    params.set('q', trimmedQuery);
  }

  if (excludePinned) {
    params.set('excludePinned', 'true');
  }

  const query = params.toString();

  return apiClient<ThreadListResponse>(`/threads${query ? `?${query}` : ''}`);
}

type GetSourcesInput = {
  turnId?: string;
  limit?: number;
  cursor?: string;
};

export async function getSources({
  turnId,
  limit,
  cursor,
}: GetSourcesInput = {}): Promise<SourcesResponse> {
  const params = new URLSearchParams();

  if (turnId) {
    params.set('turnId', turnId);
  }

  if (limit) {
    params.set('limit', String(limit));
  }

  if (cursor) {
    params.set('cursor', cursor);
  }

  const query = params.toString();

  return apiClient<SourcesResponse>(`/sources${query ? `?${query}` : ''}`);
}

export async function postAsk(
  question: string,
  threadId?: string,
): Promise<AskResponse> {
  return apiClient<AskResponse>('/ask', {
    method: 'POST',
    body: JSON.stringify({ question, threadId }),
  });
}

export async function streamAsk(
  question: string,
  threadId: string | undefined,
  handlers: AskStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return streamAskRequest(
    '/ask/stream',
    { question, threadId },
    handlers,
    signal,
  );
}

export async function streamRetryAsk(
  threadId: string,
  turnId: string,
  handlers: AskStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return streamAskRequest(
    '/ask/retry',
    { threadId, turnId },
    handlers,
    signal,
  );
}

async function streamAskRequest(
  path: string,
  body: Record<string, string | undefined>,
  handlers: AskStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(getApiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = (await response.text()) || response.statusText || errorMessage;
    }

    throw new ApiError(response.status, errorMessage);
  }

  if (!response.body) {
    throw new NetworkError('Streaming response was empty');
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let streamError: AskStreamErrorEvent | null = null;
  const parser = createSseParser((event) => {
    const data = JSON.parse(event.data);

    if (event.event === 'start') {
      handlers.onStart?.(data as AskStreamStartEvent);
      return;
    }

    if (event.event === 'delta') {
      handlers.onDelta?.(String(data.text ?? ''));
      return;
    }

    if (event.event === 'progress') {
      handlers.onProgress?.(data as AskStreamProgressEvent);
      return;
    }

    if (event.event === 'final') {
      handlers.onFinal?.(data as AskResponse);
      return;
    }

    if (event.event === 'error') {
      streamError = {
        message: String(data.message ?? 'Ask failed'),
        code: data.code ?? 'ASK_FAILED',
        retryable: Boolean(data.retryable),
      };
      handlers.onError?.(streamError);
      return;
    }

    if (event.event === 'done') {
      handlers.onDone?.();
    }
  });

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      parser.feed(decoder.decode(value, { stream: true }));
    }

    parser.feed(decoder.decode());
    parser.end();
  } catch (error) {
    if (error instanceof Error) {
      throw new NetworkError(error.message);
    }

    throw new NetworkError('Streaming request failed');
  }

  const finalStreamError = streamError as AskStreamErrorEvent | null;
  if (finalStreamError) {
    throw new ApiError(503, finalStreamError.message);
  }
}

export async function deleteThread(
  threadId: string,
): Promise<void> {
  return apiClient<void>(`/threads/${threadId}`, {
    method: 'DELETE',
  });
}

export async function deleteThreads(
  threadIds: string[],
): Promise<BulkDeleteThreadsResponse> {
  return apiClient<BulkDeleteThreadsResponse>('/threads', {
    method: 'DELETE',
    body: JSON.stringify({ threadIds }),
  });
}

export async function renameThread(
  threadId: string,
  title: string,
): Promise<ThreadSummaryItem> {
  return apiClient<ThreadSummaryItem>(`/threads/${threadId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function toggleThreadPin(
  threadId: string,
  isPinned: boolean,
): Promise<ThreadSummaryItem> {
  return apiClient<ThreadSummaryItem>(`/threads/${threadId}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ isPinned }),
  });
}

export async function getPinnedThreads({
  limit,
}: PinnedThreadListQueryInput = {}): Promise<ThreadSummaryItem[]> {
  const params = new URLSearchParams();

  if (limit) {
    params.set('limit', String(limit));
  }

  const query = params.toString();

  return apiClient<ThreadSummaryItem[]>(
    `/threads/pinned${query ? `?${query}` : ''}`,
  );
}
