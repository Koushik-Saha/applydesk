// PROJECT_SPEC.md §10 — "Rate limit extension + AI routes (simple DB or in-memory token bucket)."

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

// Clean up stale buckets periodically (every 10 minutes)
if (typeof setInterval !== "undefined") {
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > 3600000) {
        buckets.delete(key);
      }
    }
  }, 600000);
  if (cleanup.unref) cleanup.unref();
}

/**
 * Checks and decrements token count for a given identifier.
 * Uses a token-bucket algorithm that smoothly refills tokens over time.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = { maxRequests: 60, windowMs: 60000 },
): RateLimitResult {
  const now = Date.now();
  const { maxRequests, windowMs } = options;
  const refillRate = maxRequests / windowMs; // tokens per ms

  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: maxRequests - 1, lastRefill: now };
    buckets.set(key, bucket);
    return {
      success: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const addedTokens = elapsed * refillRate;
  bucket.tokens = Math.min(maxRequests, bucket.tokens + addedTokens);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      success: true,
      remaining: Math.floor(bucket.tokens),
      resetAt: now + Math.ceil((maxRequests - bucket.tokens) / refillRate),
    };
  }

  // Rate limit exceeded
  const timeToWait = Math.ceil((1 - bucket.tokens) / refillRate);
  return {
    success: false,
    remaining: 0,
    resetAt: now + timeToWait,
  };
}

/**
 * Resets a specific bucket (useful for testing or manual resets).
 */
export function resetRateLimit(key?: string): void {
  if (key) {
    buckets.delete(key);
  } else {
    buckets.clear();
  }
}
