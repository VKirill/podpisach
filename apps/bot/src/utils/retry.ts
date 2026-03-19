export interface RetryOptions {
  maxRetries?: number
  delayMs?: number
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3
  const delayMs = opts.delayMs ?? 1000

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        const wait = delayMs * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, wait))
      }
    }
  }

  throw lastError
}
