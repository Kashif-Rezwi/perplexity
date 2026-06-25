export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  createError: () => Error,
  onTimeout?: () => void,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;

  return new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      onTimeout?.();
      reject(createError());
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
