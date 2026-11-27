import "server-only";
import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";

/**
 * Builds a storage key like "otp-email:9f2c...". The identifier (email, IP) is
 * hashed with a secret so raw emails and IP addresses are never stored.
 */
export function rateLimitKey(scope, identifier) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET environment variable");
  const digest = createHmac("sha256", secret).update(String(identifier)).digest("hex").slice(0, 32);
  return `${scope}:${digest}`;
}

/** Best-effort client IP. Only trustworthy behind a proxy that sets these headers (Vercel does). */
export function getClientIp(request) {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

/**
 * Counts one attempt for `key` and says whether it is within the limit.
 * Fixed window: `limit` attempts per `windowSeconds`, windows aligned to the database clock.
 * The whole count is ONE atomic SQL statement, so simultaneous requests cannot slip past the limit.
 * Returns { allowed, remaining, retryAfterSeconds }.
 */
export async function checkRateLimit({ key, limit, windowSeconds }) {
  const [row] = await sql`
    with w as (
      select to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}::int) * ${windowSeconds}::int) as start
    )
    insert into rate_limits (key, window_start, hits, expires_at)
    select ${key}, w.start, 1, w.start + make_interval(secs => ${windowSeconds}::int * 2)
    from w
    on conflict (key, window_start) do update set hits = rate_limits.hits + 1
    returning
      hits,
      greatest(1, ceil(extract(epoch from (window_start + make_interval(secs => ${windowSeconds}::int) - now()))))::int as retry_after`;

  // Postgres has no automatic expiry, so occasionally sweep old rows (about 1 request in 50).
  if (Math.random() < 0.02) {
    try {
      await sql`delete from rate_limits where expires_at < now()`;
    } catch (error) {
      console.error("Rate limit cleanup failed", error?.code || error?.name);
    }
  }

  const hits = Number(row.hits);
  return {
    allowed: hits <= limit,
    remaining: Math.max(0, limit - hits),
    retryAfterSeconds: row.retryAfter,
  };
}

/** Standard 429 response with a Retry-After header. */
export function tooManyRequests(retryAfterSeconds, message = "Too many requests. Please try again later.") {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const wait = retryAfterSeconds < 90 ? "a minute" : `${minutes} minutes`;
  return NextResponse.json(
    { error: `${message} Try again in ${wait}.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}