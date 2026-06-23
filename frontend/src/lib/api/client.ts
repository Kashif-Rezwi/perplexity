/**
 * Centralised backend URL used by the API client (server-side requests)
 * and the Next.js dev proxy rewrite (next.config.ts).
 *
 * Override at runtime via the BACKEND_URL environment variable.
 */
export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly retryable?: boolean,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export function getApiUrl(path: string): string {
  const isServer = typeof window === 'undefined';
  const baseUrl = isServer ? `${BACKEND_URL}/perplexity` : '/api/perplexity';

  return `${baseUrl}${path}`;
}

export async function apiClient<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = getApiUrl(path);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = 'An unexpected error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Fallback to text or generic message
        errorMessage = await response.text() || response.statusText || errorMessage;
      }

      throw new ApiError(response.status, errorMessage);
    }

    // For 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new NetworkError(
      error instanceof Error ? error.message : 'Network request failed',
    );
  }
}
