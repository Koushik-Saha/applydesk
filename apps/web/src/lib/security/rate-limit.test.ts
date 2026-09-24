import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimit();
    vi.useRealTimers();
  });

  it("allows requests up to maxRequests", () => {
    const key = "user_1";
    const options = { maxRequests: 3, windowMs: 10000 };

    const first = checkRateLimit(key, options);
    expect(first.success).toBe(true);
    expect(first.remaining).toBe(2);

    const second = checkRateLimit(key, options);
    expect(second.success).toBe(true);
    expect(second.remaining).toBe(1);

    const third = checkRateLimit(key, options);
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = checkRateLimit(key, options);
    expect(fourth.success).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.resetAt).toBeGreaterThan(Date.now());
  });

  it("tracks different keys independently", () => {
    const options = { maxRequests: 1, windowMs: 10000 };

    expect(checkRateLimit("user_A", options).success).toBe(true);
    expect(checkRateLimit("user_A", options).success).toBe(false);

    // user_B has their own bucket
    expect(checkRateLimit("user_B", options).success).toBe(true);
  });

  it("refills tokens over time", () => {
    vi.useFakeTimers();
    const key = "user_refill";
    const options = { maxRequests: 2, windowMs: 2000 }; // 1 token per 1000ms

    expect(checkRateLimit(key, options).success).toBe(true);
    expect(checkRateLimit(key, options).success).toBe(true);
    expect(checkRateLimit(key, options).success).toBe(false);

    // Advance time by 1.1s (1 token should refill)
    vi.advanceTimersByTime(1100);

    expect(checkRateLimit(key, options).success).toBe(true);
    expect(checkRateLimit(key, options).success).toBe(false);
  });
});
