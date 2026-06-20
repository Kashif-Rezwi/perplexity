import { ApiError, NetworkError } from '@/lib/api/client';

export function getThreadMutationErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof NetworkError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
