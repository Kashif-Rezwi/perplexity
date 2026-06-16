import { apiClient } from './client';
import type { ThreadDetailResponse, SourcesResponse, AskResponse } from '@/types/api.types';

export async function getThread(
  threadId: string,
): Promise<ThreadDetailResponse> {
  return apiClient<ThreadDetailResponse>(`/threads/${threadId}`);
}

type GetSourcesInput = {
  turnId?: string;
  limit?: number;
};

export async function getSources({
  turnId,
  limit,
}: GetSourcesInput = {}): Promise<SourcesResponse> {
  const params = new URLSearchParams();

  if (turnId) {
    params.set('turnId', turnId);
  }

  if (limit) {
    params.set('limit', String(limit));
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
