<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sahalak — Agent Field Guide

## Project purpose and current status

Sahalak is a Next.js app for local market commerce and flexible work. The core product goal is to help shop owners find workers for short shifts or longer periods. Customers should be able to find shops by market location; ordinary users should be able to activate a worker profile when that feature is built.

**Implemented:** animated landing page; owner/user role selection; GitHub and email/password signup/login; email OTP verification and request throttling; protected-route redirects and database-backed role checks; owner shop setup; Supabase shop-image storage; market/stall/category schema and a seeded placeholder market; market/stall/category selection in owner setup.

**Not implemented yet:** public market directory UI, public shop search page, interactive market map, owner catalog/open-status/offers dashboard, worker profile/shift/application/check-in/payment/rating features, and admin review UI. The dashboard route is a placeholder. Treat the Para Market layout as sample data, not surveyed real-world data.

`README.md` is the user-facing setup and feature guide. This file is the technical handoff: follow it before changing code, but verify details against source and the current Git diff when necessary.

## Stack and architecture

- Next.js **16.4.6** App Router; React **19.3**; Tailwind CSS **4**.
- Auth.js / NextAuth **v5 beta** with GitHub OAuth, credentials (email/password), and JWT sessions.
- Supabase-hosted PostgreSQL accessed with the `postgres` package. There is no ORM; queries are tagged and parameterized.
- Supabase Storage for shop images; the public bucket is named `shop-images`.
- Zod 4 for shared shop validation; Resend for verification emails; Node `crypto` for scrypt password hashing and HMAC OTP/rate-limit identifiers.
- Next config enables `cacheComponents`, partial prefetching, and React Compiler. It allows image qualities `[72, 75, 82]` and derives the remote image hostname from `SUPABASE_URL`.

App code is in `src/app`. Server-only utilities live in `src/app/lib`. Interactive React components use `"use client"`. Keep database access, provider keys, and privileged Supabase calls on the server.

## Feature map and important files

| Feature | Key files | Current responsibility |
|---|---|---|
| Landing page | `src/app/page.js`; `src/app/components/{Hero,MarketJourney,Header,Footer}.js` | Product landing page and animated scroll journey. |
| Role choice | `src/app/choose-role/{login,signup}/page.js`; `src/app/components/RoleChoice.js` | Choose owner or user account flow. |
| Signup/login UI | `src/app/signup/page.js`, `src/app/login/page.js`; `SignupForm.js`, `Loginform.js` | Client forms, OTP stages, GitHub/credentials sign-in. |
| Auth core | `src/app/lib/auth/{auth.js,auth.config.js,password.js,otp.js}` | Auth.js providers/callbacks, user mapping, password and OTP functions. |
| Signup API | `src/app/api/signup/{request-otp,verify-otp}/route.js` | Validate, throttle, stage, email, verify, and create signup accounts. |
| Roles/proxy | `src/app/lib/auth/{require-role.js,proxy.js}`; root `proxy.js` | Current DB role checks; sign-in redirects for protected paths. |
| Owner setup page | `src/app/owner/setup/page.js`; `src/app/components/OwnerSetupForm.js` | Server-loaded markets/categories; client market/stall/category/photo form. |
| Owner setup APIs | `src/app/api/owner/shop/route.js`; `src/app/api/owner/shop/options/route.js` | Save profile; authenticated stall options by market. |
| Owner persistence | `src/app/lib/shops/owner-shop.js` | Selection validation and atomic role/shop/stall/category transaction. |
| Market queries | `src/app/lib/markets.js` | Server-only market, stall, category and verified-shop search queries. |
| Validation | `src/app/lib/validation/shop.js` | Shared Zod schema, `MAX_CATEGORIES`, `shopFormToObject`, issue-to-field-error mapping. |
| Database/storage | `src/app/lib/db/index.js`; `src/app/lib/storage/shop-images.js` | Postgres connection and server-side Supabase image lifecycle. |
| Schema and data | `db/schema.sql`, numbered `db/*.sql`, `db/seed/para-market.sql` | Base tables, migrations, RLS changes and placeholder market data. |
| Setup utilities | `script/test-db.mjs`, `script/ensure-shop-image-bucket.mjs`, `script/migrate-shop-images.mjs` | Check Postgres, provision/probe bucket, backfill old images. |

## Roles, sessions, and authorization

- Normal roles are `user` and `owner`. Signup role is user/owner; a user can activate owner status through shop setup. An optional `admin` role exists only after `db/002-admin-role.sql`; assign it manually. Never create/promote admins through a public API.
- Auth.js uses JWT sessions. GitHub sign-in requires a verified GitHub email and upserts/links a `users` row in the JWT callback. Credentials sign-in requires an existing, email-verified user and checks the stored scrypt password hash. The session carries the database user ID and role.
- Owner setup refreshes the JWT role after the database promotion with `unstable_update`.
- Root `proxy.js` redirects signed-out requests for `/owner/setup`, `/dashboard/*`, `/owner/dashboard/*`, and `/worker/dashboard/*`. Proxy is only a navigation guard; it is not authorization for APIs.
- Use `requireRole()` for protected server pages and `withRole()` for route handlers from `src/app/lib/auth/require-role.js`. They load the user's current record and role from PostgreSQL (so current DB role wins over stale JWT role). Pages redirect on access failure; `withRole` returns JSON 401 or 403.
- Owner shop and options APIs accept `user` and `owner`; the endpoint must not overwrite an `admin` account's role.

## Signup and OTP flow

1. `SignupForm` posts name, normalized email, password and requested role to `POST /api/signup/request-otp`. Password must be at least 10 characters; the UI checks confirmation.
2. The API verifies same-origin, validates fields, and applies database-backed fixed-window limits: 10 requests/IP/10 minutes, 5/email/hour, and a global daily email cap from optional `OTP_DAILY_EMAIL_LIMIT` (default 100). IP/email keys are HMACed with `AUTH_SECRET`; raw IP/email values are not written to `rate_limits`.
3. It hashes the password with scrypt, stores a pending signup row with an HMAC OTP digest, and sends an 8-digit OTP using Resend. Code expiry is 10 minutes; resend cooldown is 60 seconds.
4. `POST /api/signup/verify-otp` checks the OTP digest, expiry, and maximum 5 failed attempts. A transaction inserts the verified user and removes the pending row. OTP plaintext is never stored.
5. Credentials sign-in only accepts verified users. GitHub OAuth is a separate sign-in path.

`db/005-rate-limit.sql` must be applied before using OTP signup against a database; without its `rate_limits` table the API returns a temporary-unavailable response. Rate-limit cleanup is best effort and removes expired rows periodically.

## Owner setup request and persistence flow

1. `/owner/setup` is a server page. Its auth-dependent content is inside `Suspense`; it calls `connection()` before `auth()` and then loads draft/active markets and categories from `src/app/lib/markets.js`.
2. `OwnerSetupForm` displays shop name, market, stall, address, phone, up to 3 categories, and a required photo. Market change requests `GET /api/owner/shop/options?marketId=...`. The options API uses `withRole`; stalls owned by someone else are disabled, while this owner's current stall is not disabled. The page does not yet load existing shop values into the form.
3. `src/app/lib/validation/shop.js` is imported by browser and server. Use `shopFormToObject(formData)`: `Object.fromEntries()` alone drops repeated checkbox values. Client checks improve feedback but server validation remains authoritative.
4. `POST /api/owner/shop` enforces same-origin and role checks, validates again, checks actual JPG/PNG/WebP bytes and the 2 MB cap, checks that market/stall/category IDs exist, and rejects a stall held by another owner.
5. The API uploads to `shop-images`, then `saveOwnerShop()` repeats selection checks inside one Postgres transaction. It promotes the user, upserts one shop per owner, claims one stall, and replaces category join rows. A unique constraint on `shop_stalls.stall_id` resolves races when two owners select the same stall.
6. New shops default to `pending`. Resubmitting a rejected shop or changing market/stall returns it to pending review; unchanged verified location remains verified. After commit, the old image is removed. If save fails, the newly uploaded image is removed. Cleanup failure is logged without exposing provider details to the browser.

`ShopFormError` carries a safe HTTP status and field messages. Storage configuration/upload failures are typed as `ShopImageStorageError`; the route maps them to safe 503/502 responses. Missing market/shop schema returns a migration hint.

## Market model and status

`db/006-market.sql` creates this hierarchy:

```text
areas → markets → zones → lanes → stalls
             └── shared categories
shops ↔ shop_stalls ↔ stalls
shops ↔ shop_categories ↔ categories
```

- Market states: `draft`, `active`, `archived`. Owner setup allows draft/active markets; public list query allows active markets only.
- Shop review states: `pending`, `verified`, `rejected`. Public shop query returns only verified shops in a selected market.
- A stall is unique to one shop. The DB composite FKs require a shop/stall/link to use the same market.
- Category selection is capped at three in the Zod schema and UI; DB category IDs are validated server-side.
- `db/seed/para-market.sql` is idempotent placeholder data for Rajajipuram/Para Market: 2 zones × 2 lanes each × 12 numbered stalls = 48. It creates a draft market. Replace with surveyed real layout before any real public launch.
- `src/app/lib/markets.js` has queries for active/draft markets, a market's stall list and occupancy, categories, and verified-shop search/filtering with pagination. Owner setup uses the first three; no public directory page/API is wired yet.
- Current configured database read check returned 1 draft/active market, 8 categories, and 48 stalls. This is only the last inspected environment snapshot; do not assume another environment has the same data.

## Database, migrations, and RLS

`src/app/lib/db/index.js` reads `DATABASE_URL`, uses TLS, disables prepared statements, limits pool size to 5, and sets `transform: postgres.camel`. Result names become camelCase; SQL names are snake_case. Use parameterized tagged SQL for all values.

| SQL file | Effect and operational caution |
|---|---|
| `db/schema.sql` | Base `users`, `pending_signups`, `shops`; extensions and initial category/shop constraints. Start here. |
| `db/002-admin-role.sql` | Optional: widens users role check for manual admin assignment. |
| `db/003-shop-image-storage.sql` | Required for image storage: adds `image_url`/`image_path`; makes legacy `image_data` nullable. |
| `db/004-drop-shop-image-data.sql` | Destructive: drops `image_data`. **Only after** `script/migrate-shop-images.mjs` copied existing files and was verified. |
| `db/005-rate-limit.sql` | Required by OTP request rate limiting; creates `rate_limits` and enables RLS on it. |
| `db/006-market.sql` | Required by current owner setup; needs base schema + 003; creates market/category/stall relations and enables RLS on new tables. |
| `db/seed/para-market.sql` | Optional sample market; run after 006. |
| `db/enable-rls.sql` | Separate guarded RLS enablement for `users`, `pending_signups`, `shops`. It checks that the executing role bypasses RLS/superuser before modifying them. Do not remove guard or use a role that could lock the app out. |

Apply SQL in Supabase SQL Editor with the intended database role. Local migration files do **not** mean they were applied in a hosted environment. Current owner setup needs `schema.sql`, `003`, `005`, `006`, and suitable market seed data. `002` is optional unless using admins; `004` is only for verified legacy-image cleanup; `enable-rls.sql` is separate and optional after confirming the app's DB role still bypasses RLS. The app's `DATABASE_URL` role must be able to access tables protected by RLS (the intended setup uses the table-owner/bypass role).

## Image storage and Next Image

- `src/app/lib/storage/shop-images.js` creates random per-owner object paths and uploads with content type/cache settings. Bucket must be public because app pages use public URLs.
- The upload helper accepts JPEG, PNG, WebP only; form and bucket cap image size at 2 MiB. Service key name is `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`; keep it server-only.
- `node --env-file=.env.local script/ensure-shop-image-bucket.mjs` creates or updates the bucket (public, allowed MIME list, 2 MiB max), then uploads and deletes a temporary probe object.
- `script/migrate-shop-images.mjs` is for old `image_data` rows; do not run migration 004 before backfill is complete.
- `next.config.mjs` builds `images.remotePatterns.hostname` from `SUPABASE_URL`. Never put `DATABASE_URL` or any credential string in Next config. Allowed quality values are `[72, 75, 82]`; update the allowlist if a component uses another value.

## Environment, setup, and commands

Required server env names: `DATABASE_URL`, `AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_URL`, and one service-role key (`SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`). `OTP_DAILY_EMAIL_LIMIT` is optional, default 100. Never read/print secret values unnecessarily, log them, expose them to client code, or commit `.env.local`. No `.env.example` currently exists.

1. `npm install` (Node 20.6+ recommended for `--env-file`).
2. Create `.env.local` locally. Use a Supabase session-pooler URL for local DB access; transaction pooler is appropriate for serverless deployments. URL-encode special characters in DB password.
3. Apply base SQL and required migrations as described above.
4. Provision/probe Storage: `node --env-file=.env.local script/ensure-shop-image-bucket.mjs`.
5. Inspect DB connectivity/tables: `node --env-file=.env.local script/test-db.mjs`.
6. Run `npm run dev`; app serves at `http://localhost:3000`.

Available package scripts: `npm run dev`, `npm run lint`, `npm run build`, `npm start`. There is no configured automated test framework. When asked to verify, lint/build are useful; a genuine owner form submission also requires an authenticated test session. A clean Next build downloads Geist via `next/font/google`, so build-time access to Google Fonts is required unless fonts are self-hosted.

## Known issues already diagnosed and fixed

| Symptom | Cause | Fix in current code |
|---|---|---|
| `auth()` caused blocking-prerender warning on owner setup | Request-bound read under `cacheComponents`. | Dynamic child uses `connection()` and is streamed within `Suspense`. |
| Next rejected route `runtime = "nodejs"` | That route config conflicted with `cacheComponents`. | Removed incompatible `runtime` declaration; use supported default runtime. |
| Image failure surfaced as generic 500 | Route checked a marker string different from storage helper's thrown error. | Typed `ShopImageStorageError`; safe status-specific error mapping. |
| `Bucket not found` on shop POST | `shop-images` did not exist in Supabase. | Provisioned with idempotent setup script; upload/delete probe passed. |
| Warning for `Image quality "72"` | Used quality was absent from config allowlist. | Added qualities `[72,75,82]`; restart Next after config change. |
| Shop save failed against old schema | Missing image/market columns or market relations. | Migrations 003 and 006; API now returns actionable schema hint. |
| Multiple category checkboxes collapsed to one | `Object.fromEntries(FormData.entries())` preserves only last duplicate. | Shared `shopFormToObject()` uses `getAll("categoryIds")`. |
| Production build could not fetch Geist | Offline/restricted Google Fonts access. | Build passed when network was available; self-host fonts if deployment cannot fetch them. |
| Wrong value used as image hostname | Database connection string had been put in `remotePatterns.hostname`. | Removed; derive hostname from `SUPABASE_URL`. Rotate DB credential if the config/repo was ever shared. |

Latest owner-setup verification: `npm run lint` passed with one pre-existing anonymous-default-export warning in `auth.config.js`; `npm run build` passed; database table/data check passed. A previous SQL smoke save used a temporary account inside a rolled-back transaction and removed its probe image. No permanent test owner was created.

## Rules for future changes

- Read the relevant local Next.js doc in `node_modules/next/dist/docs/` before changing an App Router API, route config, image API, or cache behavior. The generated block above is part of this rule; do not remove it.
- Read code and `git status` before editing. Preserve uncommitted user work; never reset unrelated changes.
- Separate Server and Client Components intentionally. Do not import `server-only` modules into client code.
- Keep client validation for usability and repeat all security/data validation in the server API.
- Add schema changes as numbered SQL files, document dependencies and required manual application, and never assume migration state from the local file tree.
- Never trust `proxy.js` as an API authorization boundary. Use `requireRole`/`withRole` and validate ownership in the DB transaction.
- Use parameterized SQL. Do not expose provider/SQL internals to clients; log safe error categories/codes.
- Do not promote shops to `verified` or markets to `active` without the intended admin/review workflow.
- Keep animation accessible (`prefers-reduced-motion`) and UI responsive; prefer Tailwind classes for local styling rather than one-off global CSS.