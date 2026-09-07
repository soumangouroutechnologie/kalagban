import { NextResponse } from 'next/server';

interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  prefix?: string;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
}

interface TokenBucket {
  timestamps: number[];
}

const memoryStore = new Map<string, TokenBucket>();
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, bucket] of memoryStore.entries()) {
    const validTimestamps = bucket.timestamps.filter(ts => now - ts < windowMs);
    if (validTimestamps.length === 0) {
      memoryStore.delete(key);
    } else {
      bucket.timestamps = validTimestamps;
    }
  }
}

export function getClientIp(req: Request): string {
  const headers = req.headers;
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return (
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    headers.get('true-client-ip') ||
    '127.0.0.1'
  );
}

export async function checkRateLimit(
  req: Request,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { limit, windowSeconds, prefix = 'global' } = options;
  const ip = getClientIp(req);
  const key = `ratelimit:${prefix}:${ip}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  cleanupExpiredEntries(windowMs);

  let bucket = memoryStore.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    memoryStore.set(key, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter(ts => now - ts < windowMs);

  const requestCount = bucket.timestamps.length;
  const oldestTimestamp = bucket.timestamps[0] || now;
  const reset = oldestTimestamp + windowMs;
  const retryAfter = Math.max(1, Math.ceil((reset - now) / 1000));

  if (requestCount >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset,
      retryAfter,
    };
  }

  bucket.timestamps.push(now);

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - (requestCount + 1)),
    reset,
    retryAfter: 0,
  };
}

export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString(),
    ...(result.retryAfter > 0 ? { 'Retry-After': result.retryAfter.toString() } : {}),
  };
}

export function rateLimitResponse(
  result: RateLimitResult,
  message = 'Trop de requêtes. Veuillez patienter avant de réessayer.'
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: createRateLimitHeaders(result),
    }
  );
}
