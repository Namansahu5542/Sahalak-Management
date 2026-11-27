-- Counters for rate limiting (used by src/app/lib/rate-limit.js).
-- One row per (key, time window). Run once in the Supabase SQL Editor.
create table if not exists rate_limits (
  key          text        not null,   -- e.g. 'otp-ip:3f9a...' (keyed hash, never a raw email or IP)
  window_start timestamptz not null,   -- start of the fixed time window this row counts
  hits         integer     not null default 1,
  expires_at   timestamptz not null,   -- when the row is safe to delete
  primary key (key, window_start)
);

create index if not exists rate_limits_expires_at_idx on rate_limits (expires_at);

-- Only the server (through DATABASE_URL) touches this table. Keep it away from the public API:
alter table rate_limits enable row level security;