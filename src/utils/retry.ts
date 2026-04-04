/**
 * Retry options configuration
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delayMs: number) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
  onRetry: () => {},
};

/**
 * Execute a function with exponential backoff retry logic
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws The last error if all retry attempts fail
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === config.maxAttempts || !config.shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delayMs = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );

      // Call retry callback
      config.onRetry(error, attempt, delayMs);

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a retry function with predefined options
 *
 * @param options - Default retry options
 * @returns A retry function with the specified options
 */
export function createRetryFunction(options: RetryOptions) {
  return <T>(fn: () => Promise<T>, overrideOptions?: RetryOptions): Promise<T> => {
    return withRetry(fn, { ...options, ...overrideOptions });
  };
}

/**
 * Predefined retry strategies
 */
export const retryStrategies = {
  /**
   * Quick retry for fast operations (3 attempts, 1s initial delay)
   */
  quick: createRetryFunction({
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
  }),

  /**
   * Standard retry for most operations (3 attempts, 2s initial delay)
   */
  standard: createRetryFunction({
    maxAttempts: 3,
    initialDelayMs: 2000,
    backoffMultiplier: 2,
  }),

  /**
   * Aggressive retry for critical operations (5 attempts, 5s initial delay)
   */
  aggressive: createRetryFunction({
    maxAttempts: 5,
    initialDelayMs: 5000,
    backoffMultiplier: 2,
    maxDelayMs: 60000,
  }),

  /**
   * Network retry for external API calls (3 attempts, 3s initial delay)
   */
  network: createRetryFunction({
    maxAttempts: 3,
    initialDelayMs: 3000,
    backoffMultiplier: 2,
    shouldRetry: (error) => {
      // Retry on network errors and 5xx status codes
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return true;
      }
      if (error.response?.status >= 500) {
        return true;
      }
      // Don't retry on 4xx errors (client errors)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        return false;
      }
      return true;
    },
  }),
};

/**
 * Retry with jitter to avoid thundering herd problem
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 */
export async function withRetryAndJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(fn, {
    ...options,
    onRetry: (error, attempt, delayMs) => {
      // Add random jitter (0-50% of delay)
      const jitter = Math.random() * delayMs * 0.5;
      const totalDelay = delayMs + jitter;

      console.log(
        `Retry attempt ${attempt} after ${totalDelay.toFixed(0)}ms (base: ${delayMs}ms, jitter: ${jitter.toFixed(0)}ms)`
      );

      if (options.onRetry) {
        options.onRetry(error, attempt, totalDelay);
      }
    },
  });
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenAttempts?: number;
}

/**
 * Create a circuit breaker wrapper for a function
 * Prevents cascading failures by stopping calls after threshold
 *
 * @param fn - The async function to wrap
 * @param options - Circuit breaker configuration
 * @returns Wrapped function with circuit breaker
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CircuitBreakerOptions = {}
): T {
  const { failureThreshold = 5, resetTimeoutMs = 60000 } = options;

  const state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'closed',
  };

  return (async (...args: any[]) => {
    // Check if circuit is open
    if (state.state === 'open') {
      const timeSinceLastFailure = Date.now() - state.lastFailureTime;

      if (timeSinceLastFailure >= resetTimeoutMs) {
        // Try half-open state
        state.state = 'half-open';
        console.log('Circuit breaker entering half-open state');
      } else {
        throw new Error('Circuit breaker is open - service unavailable');
      }
    }

    try {
      const result = await fn(...args);

      // Success - reset circuit breaker
      if (state.state === 'half-open') {
        state.state = 'closed';
        state.failures = 0;
        console.log('Circuit breaker closed - service recovered');
      }

      return result;
    } catch (error) {
      state.failures++;
      state.lastFailureTime = Date.now();

      if (state.failures >= failureThreshold) {
        state.state = 'open';
        console.error(`Circuit breaker opened after ${state.failures} failures`);
      }

      throw error;
    }
  }) as T;
}
