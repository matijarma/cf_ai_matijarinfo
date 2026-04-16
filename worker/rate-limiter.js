const LIMIT_MIN = 1;
const LIMIT_MAX = 20_000;
const WINDOW_MS_MIN = 1_000;
const WINDOW_MS_MAX = 3_600_000;
const COST_MIN = 1;
const COST_MAX = 5_000;

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export class LlmRateLimiter {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    if (request.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const payload = await request.json().catch(() => null);

    if (!payload || typeof payload !== "object") {
      return jsonResponse({ error: "invalid_payload" }, 400);
    }

    const nowMs =
      Number.isFinite(payload.nowMs) && Number(payload.nowMs) > 0
        ? Math.trunc(Number(payload.nowMs))
        : Date.now();
    const limit = clampInteger(payload.limit, LIMIT_MIN, LIMIT_MAX, 60);
    const windowMs = clampInteger(payload.windowMs, WINDOW_MS_MIN, WINDOW_MS_MAX, 60_000);
    const cost = clampInteger(payload.cost, COST_MIN, COST_MAX, 1);
    const storedBucket = await this.state.storage.get("bucket");
    const bucket =
      storedBucket && typeof storedBucket === "object"
        ? storedBucket
        : {
            windowStartMs: nowMs,
            count: 0,
          };

    if (
      !Number.isFinite(bucket.windowStartMs) ||
      !Number.isFinite(bucket.count) ||
      nowMs < bucket.windowStartMs ||
      nowMs - bucket.windowStartMs >= windowMs
    ) {
      bucket.windowStartMs = nowMs;
      bucket.count = 0;
    }

    if (bucket.count + cost > limit) {
      const elapsedMs = Math.max(0, nowMs - bucket.windowStartMs);
      const retryAfterMs = Math.max(0, windowMs - elapsedMs);

      return jsonResponse({
        allowed: false,
        limit,
        remaining: 0,
        retryAfterMs,
        retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      });
    }

    bucket.count += cost;
    await this.state.storage.put("bucket", bucket);

    return jsonResponse({
      allowed: true,
      limit,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterMs: 0,
      retryAfterSec: 0,
    });
  }
}
