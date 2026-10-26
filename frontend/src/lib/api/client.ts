/**
 * Centralised backend URL used by the API client (server-side requests)
 * and the Next.js dev proxy rewrite (next.config.ts).
 *
 * Override at runtime via the BACKEND_URL environment variable.
 */
export const BACKEND_URL = (
  process.env.BACKEND_URL ?? 'http://localhost:8080'
).replace(/\/+$/, '');

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

export async function readErrorMessage(response: Response): Promise<string> {
  const fallback = 'An unexpected error occurred';
  const text = await response.text();

  if (!text) {
    return response.statusText || fallback;
  }

  try {
    const errorData: unknown = JSON.parse(text);
    if (errorData && typeof errorData === 'object') {
      const message = (errorData as { message?: unknown }).message;
      // NestJS emits `message` as a string for most errors, but as string[]
      // for class-validator failures (see GlobalExceptionFilter).
      if (typeof message === 'string' && message) {
        return message;
      }
      if (Array.isArray(message) && message.length > 0) {
        return message.join('; ');
      }
    }
  } catch {
    // Not JSON — fall through to the raw text below.
  }

  return text || response.statusText || fallback;
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
      const errorMessage = await readErrorMessage(response);
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
