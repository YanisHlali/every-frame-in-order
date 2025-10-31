import { logger } from './logger';

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  onRetry: () => {}
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts) {
        logger.error('Retry attempts exhausted', {
          attempts: attempt,
          error
        });
        throw error;
      }

      const delay = Math.min(
        opts.delayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      );

      logger.warn('Retry attempt failed, retrying...', {
        attempt,
        nextDelayMs: delay,
        error: error instanceof Error ? error.message : String(error)
      });

      opts.onRetry(attempt, error);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset')
    ) {
      return true;
    }
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as { status?: number; code?: string };
    if (err.status && err.status >= 500 && err.status < 600) {
      return true;
    }
    if (err.status === 429) {
      return true;
    }
    if (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      return true;
    }
  }

  return false;
}

export async function retryIfRetryable<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retry(async () => {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableError(error)) {
        throw error;
      }
      throw error;
    }
  }, options);
}
