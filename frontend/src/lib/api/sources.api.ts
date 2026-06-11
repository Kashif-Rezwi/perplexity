import { apiClient } from './client';
import type { SourcesResponse } from '@/types/api.types';

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
