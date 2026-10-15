type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

/** Simple in-memory sliding window. Fine for single-node deploys (Vercel warm instances). */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  buckets.set(key, current);
  return {
    ok: true,
    remaining: limit - current.count,
    retryAfterSec: 0,
  };
}

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

export function rateLimitResponse(retryAfterSec: number) {
  return Response.json(
    {
      message: "Too many requests. Please try again shortly.",
      timestamp: new Date().toISOString(),
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec || 60) },
    }
  );
}
