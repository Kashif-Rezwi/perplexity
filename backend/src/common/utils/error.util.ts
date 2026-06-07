export function getErrorMessage(
  error: unknown,
  fallback = String(error),
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
