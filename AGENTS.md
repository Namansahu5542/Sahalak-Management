<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sahalak — Agent Guide

## Purpose and current scope

Sahalak helps local market businesses find people for short or longer work periods. Customers can discover shops; regular users can later activate a worker profile. The animated landing page, account selection, signup/login, and owner shop setup exist. The market database model, seed layout, and server query helpers have been added, but public market pages and owner market/stall selection are not wired yet. Worker shifts and full dashboards are still planned or placeholders. Use `README.md` for the product overview and roadmap; this file explains how to work safely in the codebase.

## Stack and architecture

- **Framework:** Next.js 16.4.6 App Router, React 19, Tailwind CSS 4. `cacheComponents` is enabled.
- **Authentication:** Auth.js / NextAuth v5 beta, GitHub OAuth and email/password credentials, JWT sessions.
- **Data:** Supabase-hosted PostgreSQL via `postgres` (parameterized SQL, no ORM).
- **Images:** Supabase Storage public bucket `shop-images`; PostgreSQL stores image URL and object path metadata.
- **Validation/email:** Zod 4; Resend for signup verification email.
- **Security utilities:** Node `crypto` for scrypt password hashes and HMAC-based OTP digests.

The App Router code is under `src/app`. Server-only modules belong under `src/app/lib`; interactive components declare `"use client"` at the top. Keep credentials and service-role operations on the server.

## Main routes and files

| Area | Files | Responsibility |
|---|---|---|
| Home/landing | `src/app/page.js`, `src/app/components/{Hero,MarketJourney,Header,Footer}.js` | Market-focused landing content and scroll animation |
| Role selection | `src/app/choose-role/login/page.js`, `src/app/choose-role/signup/page.js`, `RoleChoice.js` | Choose owner or regular user before authentication |
| Auth | `src/app/lib/auth/auth.js`, `auth.config.js`, `password.js`, `otp.js` | Auth.js providers/callbacks, password verification, OTP helpers |
| Signup APIs | `src/app/api/signup/request-otp/route.js`, `verify-otp/route.js` | Issue, email, check OTP, and create verified accounts |
| Owner setup UI | `src/app/owner/setup/page.js`, `src/app/components/OwnerSetupForm.js` | Authenticated shop setup page and interactive form |
| Owner shop API | `src/app/api/owner/shop/route.js` | Validate form, upload image, promote account, upsert shop |
| Market data | `db/006-market.sql`, `db/seed/para-market.sql`, `src/app/lib/markets.js` | Market hierarchy schema, placeholder Para Market layout, server query functions; no market UI yet |
| Authorization | `src/app/lib/auth/require-role.js`, root `proxy.js` | Database-backed role checks and signed-out redirects |
| Signup rate limiting | `db/005-rate-limit.sql`, `src/app/lib/rate-limit.js` | Atomic database fixed-window counters used by signup OTP requests |
| Database | `src/app/lib/db/index.js`, `db/schema.sql`, `db/*.sql` | Postgres client, base schema, ordered schema changes |
| Storage | `src/app/lib/storage/shop-images.js`, `script/ensure-shop-image-bucket.mjs` | Server-side shop image operations and bucket provisioning |
| Shared shop validation | `src/app/lib/validation/shop.js` | Categories and Zod schema shared by client and API |

## Important behavior and data flows

### Roles and authorization

- Normal account roles are `user` and `owner`. A user becomes an owner by completing shop setup. The optional `admin` role is added by `db/002-admin-role.sql` and must be assigned manually; no public API should grant it.
- `proxy.js` redirects signed-out visitors from protected URL prefixes. Treat this as navigation UX, **not** as an authorization boundary.
- For sensitive pages and APIs, use `requireRole` or `withRole` from `src/app/lib/auth/require-role.js`. These helpers load the account and current role from PostgreSQL instead of trusting the JWT role claim. `requireRole` redirects pages; `withRole` returns JSON 401 for unauthenticated requests and 403 for disallowed roles.
- The shop setup endpoint allows `user` and `owner` so a regular account can activate its owner profile; it must not overwrite an admin role.

### Signup and login

1. Signup UI calls `POST /api/signup/request-otp` with name, normalized email, password, and role.
2. The endpoint checks rate limits by IP (10 per 10 minutes), email (5 per hour), and a global daily email cap (`OTP_DAILY_EMAIL_LIMIT`, default 100). Rate-limit identifiers are HMACed with `AUTH_SECRET`; raw IPs/emails are not stored in `rate_limits`.
3. It validates input, hashes the password, writes a pending signup row with an OTP digest, and sends an 8-digit code with Resend. Codes expire after 10 minutes, permit at most 5 verification attempts, and have a 60-second resend cooldown.
4. `POST /api/signup/verify-otp` checks the digest/expiry/attempt limit and creates the verified user. OTP plaintext is not stored.
5. Auth.js uses JWT sessions for GitHub and credentials sign-in. GitHub email must be verified. Keep account/session IDs tied to the `users` table.

### Owner shop setup

1. The server page at `/owner/setup` checks the session inside a streamed `Suspense` child because `cacheComponents` is enabled; `connection()` makes the auth-dependent region dynamic.
2. `OwnerSetupForm` validates before submit and sends `FormData` to `POST /api/owner/shop`.
3. The API enforces same-origin and role checks, validates again with the shared Zod schema, and verifies the image's actual bytes (JPG/PNG/WebP, maximum 2 MB).
4. The image uploads to `shop-images`; then a PostgreSQL transaction promotes the `users` row and upserts the owner's single `shops` row with image URL/path metadata.
5. If the database write fails, remove the newly uploaded object. After a successful replacement, remove the previous object. Keep these operations ordered to avoid orphaning the current image.

## Database and Storage rules

- Base schema: `db/schema.sql`. `postgres` uses `transform: postgres.camel`, so snake_case result columns become camelCase in JavaScript; SQL column names remain snake_case.
- `db/003-shop-image-storage.sql` adds `image_url` and `image_path` and makes legacy `image_data` nullable. Apply it before using shop image uploads on an existing database.
- `db/004-drop-shop-image-data.sql` is destructive to legacy image bytes. **Only run it after** `script/migrate-shop-images.mjs` has successfully copied every existing image to Storage; it contains a guard but still drops the old column.
- `db/002-admin-role.sql` widens the role check for manually managed admins; it is not required for ordinary users/owners.
- `db/005-rate-limit.sql` creates the `rate_limits` table required by OTP request throttling. Apply it before testing email signup against a database.
- `db/006-market.sql` creates the market hierarchy (`areas` → `markets` → `zones` → `lanes` → `stalls`), category tables, and shop-location joins. It requires `db/schema.sql` and `db/003-shop-image-storage.sql`; it enables RLS on its new tables. The current owner form still uses legacy market/category text and is not yet connected to this model.
- `db/seed/para-market.sql` adds a **placeholder** Para Market, Rajajipuram layout (two zones, four lanes, twelve numbered stalls per lane). Treat it as sample data, not a verified survey. It creates the market in `draft` state; public shop queries only return `verified` shops in active markets.
- `src/app/lib/markets.js` provides parameterized server queries for markets, stalls, categories, and verified shop search/filtering. It is not currently called by a market page or API.
- `db/enable-rls.sql` enables RLS for the original `users`, `pending_signups`, and `shops` tables only after checking that the executing database role bypasses RLS. It is a separate manual step; do not run it with a role that could lock the app out. The app connects through `DATABASE_URL` as the table owner.
- Bucket is public so stored `getPublicUrl()` values can be shown without signed URLs. Upload/delete use a server-side service key (`SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`). Never expose this key to client components.
- To provision or repair bucket settings and verify write/delete access, run `node --env-file=.env.local script/ensure-shop-image-bucket.mjs`.
- Use parameterized tagged SQL (`sql\`... ${value} ...\``). Do not interpolate untrusted strings into SQL text.

## Local setup and verification

1. Install with `npm install` and configure `.env.local` (never commit or print its values).
2. Apply `db/schema.sql`, then required numbered migrations in order. For current signup and shop flows this includes `db/003-shop-image-storage.sql` and `db/005-rate-limit.sql`; apply `db/002-admin-role.sql` only if using admin accounts. Apply `db/006-market.sql` only when working on market data, then optionally load `db/seed/para-market.sql`.
3. Run `node --env-file=.env.local script/ensure-shop-image-bucket.mjs` to provision and probe Storage.
4. Run `node --env-file=.env.local script/test-db.mjs` to check the database; run `npm run dev` to start the app.
5. When verification is requested, use `npm run lint` and `npm run build`. A real shop-form submission also needs a signed-in test account/session. No automated test framework is currently configured.

Required server environment variable names include `DATABASE_URL`, `AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `SUPABASE_URL`, and one Supabase service-role key. Never include their values in logs, generated docs, source code, or tool output.
`OTP_DAILY_EMAIL_LIMIT` is optional and defaults to 100 OTP emails per day across the app.

## Next.js and UI conventions

- This project runs Next.js 16.4.6, and its APIs may differ from older examples. Before changing a Next.js API, read the relevant file under `node_modules/next/dist/docs/` as the generated instructions above require.
- With `cacheComponents`, keep request-bound reads such as `auth()` inside a `Suspense` boundary; follow the existing `connection()` pattern in `src/app/owner/setup/page.js`.
- Tailwind utilities are the default for page styling. Avoid adding global CSS for one-off component styles.
- `next.config.mjs` allows `next/image` qualities `[72, 75, 82]`; if a new quality is introduced, add it to `images.qualities`. Derive the allowed remote image host from `SUPABASE_URL`, never from `DATABASE_URL`.
- Respect `prefers-reduced-motion` for animations and use semantic labels/alt text for controls and images.

## Change workflow

- Read the relevant page, component, API, schema, and existing diff before editing. Preserve unrelated user changes; do not reset or overwrite them.
- Keep browser-only state and APIs in client components; keep database, Supabase service keys, and privileged operations in server modules/route handlers.
- Reuse the shared Zod schema where client and server need the same validation, but always validate at the server boundary too.
- Add schema changes as numbered SQL migrations and document any required manual Supabase step. Do not assume a local migration file has already been applied to the hosted database.
- Keep error responses useful but safe: do not return SQL/provider internals or secrets to clients. Log a category/code that helps diagnose the failure.
- No full market directory, map, staffing workflow, or finished dashboard exists yet; inspect current code before treating roadmap items as implemented.
