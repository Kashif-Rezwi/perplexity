import { apiClient } from './client';
import type { AskResponse } from '@/types/api.types';

export async function postAsk(
  question: string,
  threadId?: string,
): Promise<AskResponse> {
  return apiClient<AskResponse>('/ask', {
    method: 'POST',
    body: JSON.stringify({ question, threadId }),
  });
}
