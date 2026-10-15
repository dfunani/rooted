import { describe, expect, it } from "vitest";
import { rateLimit } from "@/src/public/utils/rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test-allow-${Date.now()}`;
    const first = rateLimit(key, 3, 60_000);
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(2);
  });

  it("blocks when the limit is exceeded", () => {
    const key = `test-block-${Date.now()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const third = rateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
  });
});
