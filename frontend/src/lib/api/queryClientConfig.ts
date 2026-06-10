import type { QueryClientConfig } from '@tanstack/react-query';

/**
 * Shared QueryClient default options used by both the server-side prefetch
 * QueryClient (in App Router page components) and the client-side provider.
 * Centralising here prevents configuration drift between the two instances.
 */
export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
};
