import { apiClient } from './client';
import type {
  AskResponse,
  SourcesResponse,
  ThreadDetailResponse,
  ThreadListQueryInput,
  ThreadListResponse,
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

export async function deleteThread(
  threadId: string,
): Promise<void> {
  return apiClient<void>(`/threads/${threadId}`, {
    method: 'DELETE',
  });
}
