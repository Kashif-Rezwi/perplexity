import { apiClient } from './client';
import type { ListSourcesResponse } from '@/types/api.types';

export type GetSourcesOptions = {
  turnId?: string;
  limit?: number;
};

export async function getSources(
  options?: GetSourcesOptions,
): Promise<ListSourcesResponse> {
  const searchParams = new URLSearchParams();
  if (options?.turnId) {
    searchParams.set('turnId', options.turnId);
  }
  if (options?.limit) {
    searchParams.set('limit', options.limit.toString());
  }

  const queryString = searchParams.toString();
  const path = queryString ? `/sources?${queryString}` : '/sources';

  return apiClient<ListSourcesResponse>(path);
}
