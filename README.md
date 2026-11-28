# Sahalak

Sahalak is being built to connect local market businesses with people who can work short or longer periods. Shops will be discoverable by market location, and regular users can activate a worker profile as that feature is developed.

> **Current status:** The animated landing page, role choice, GitHub and email/password authentication, OTP signup verification, owner business setup, market/stall/category data model, and shop-image storage are implemented. The owner setup flow uses the market model. Public market browsing, the interactive market map, worker shifts, and complete owner/worker dashboards are not implemented yet.

## Technology

| Area | Technology |
|---|---|
| Web framework | Next.js 16.4.6 App Router, React 19 |
| Styling and animation | Tailwind CSS 4, CSS/SVG animations, reduced-motion support |
| Authentication | Auth.js / NextAuth v5 beta, GitHub OAuth, email/password credentials, JWT sessions |
| Relational data | Supabase-hosted PostgreSQL, `postgres` tagged SQL client |
| Shop photos | Supabase Storage public bucket `shop-images` |
| Validation | Zod 4, shared shop form schema on browser and server |
| Verification email | Resend API |
| Password and OTP security | Node `crypto`, scrypt password hashes, HMAC OTP digests |

Next.js `cacheComponents` is enabled. Request-dependent authentication/data must follow the existing streaming and `Suspense` patterns. Before using an unfamiliar Next.js API, read the relevant guide in `node_modules/next/dist/docs/`; the generated rules in `AGENTS.md` also require this.

## What is implemented

### Landing page

- Responsive Sahalak landing page centered on helping local businesses find workers for short and longer periods.
- Scroll-driven market journey: route draws, nearby stalls light up, and an animated person follows the path.
- Reduced-motion handling for people who prefer less animation.
- Header, calls to action, and footer.

### Signup and login

- Users choose one of two account experiences: **owner** or **user**. A regular user may become an owner by completing shop setup.
- Signup routes: `/signup?role=user` and `/signup?role=owner`.
- GitHub OAuth and email/password credentials are supported. GitHub email must be verified. The first successful GitHub sign-in upserts/links a row in `users`; credentials sign-in looks up an already verified user. Auth.js sessions use JWTs with the database user ID.
- Email signup requests an 8-digit verification code through Resend. The pending signup stores the scrypt password hash and an HMAC OTP digest, not the plaintext code.
- Codes expire after 10 minutes, allow up to 5 verification attempts, and are subject to a 60-second resend cooldown.
- `POST /api/signup/request-otp` is rate-limited by IP (10 requests/10 minutes), email (5/hour), and a global daily cap (`OTP_DAILY_EMAIL_LIMIT`, default 100). IP/email keys are HMACed using `AUTH_SECRET`; raw identifiers are not stored in `rate_limits`.

### Owner shop setup

- `/owner/setup` has a responsive two-column form and information/animation panel with the market photo background.
- Fields: shop name, market, lane/stall, address or landmark, contact phone, up to 3 categories, and a shop photo/logo.
- Markets and categories are loaded on the server. When a market is selected, `GET /api/owner/shop/options?marketId=...` loads its stalls. Stalls claimed by another shop are disabled; an owner's currently claimed stall remains selectable while editing.
- Shared Zod validation handles UUIDs, required fields, phone format, category count, and image file size/type. `shopFormToObject()` uses `FormData.getAll("categoryIds")` so multiple checked categories are not lost.
- The API checks the actual uploaded image signature as well as MIME type, accepts JPG/PNG/WebP, and enforces a 2 MB maximum.
- Image upload happens before the database transaction. The transaction verifies market/stall/category IDs again, changes the user's role to `owner`, upserts the shop, claims the stall, and replaces category links. The unique stall constraint resolves simultaneous claims. On a failed save the new image is removed; after a successful replacement the old image is removed.
- New shops are `pending` review. Public search helpers only return `verified` shops in active markets. A changed market/stall or rejected-shop resubmission returns to `pending`.
- The API upserts one shop per owner, but the current setup page does not yet load existing shop values into the form for editing.

### Market data foundation

`db/006-market.sql` defines:

```text
areas → markets → zones → lanes → stalls
                       categories
shops ↔ shop_stalls ↔ stalls
shops ↔ shop_categories ↔ categories
```

- Markets have `draft`, `active`, or `archived` status. Shops have `pending`, `verified`, or `rejected` status.
- Categories form a parent/child tree. Existing category values are migrated into the `categories` and `shop_categories` tables.
- `src/app/lib/markets.js` contains server-only, parameterized queries for markets, stalls, categories, and verified shop search/filtering. Owner setup currently uses the market, category, and stall functions. Public market browsing does not yet call the public search query.
- `db/seed/para-market.sql` is a **placeholder** Rajajipuram/Para Market layout: 2 zones, 4 lanes, and 12 numbered stalls per lane (48 total). It is draft data, not verified survey information.

## Authentication and route protection

- `src/app/lib/auth/auth.js` configures GitHub and credentials auth, links sessions to database user IDs, and refreshes role claims after owner activation.
- `src/app/lib/auth/password.js` and `otp.js` implement password hashing and OTP helpers.
- `src/app/lib/auth/require-role.js` checks the current role from PostgreSQL. Use `requireRole()` for protected server pages and `withRole()` for route handlers; the latter returns JSON 401/403 responses.
- Root `proxy.js` redirects signed-out users away from `/owner/setup`, `/dashboard/*`, `/owner/dashboard/*`, and `/worker/dashboard/*`. This is a navigation redirect; sensitive APIs and pages must still enforce authorization themselves.
- Normal roles are `user` and `owner`. The optional `admin` role is added by `db/002-admin-role.sql` and must only be assigned manually; no public signup/API should grant it.

## Database migrations and data safety

Start with `db/schema.sql`, then apply migrations in order when their feature is needed:

| File | Purpose / requirement |
|---|---|
| `db/schema.sql` | Base `users`, `pending_signups`, and `shops` tables, extensions, and initial constraints. |
| `db/002-admin-role.sql` | Optional role constraint change for manually managed admins. |
| `db/003-shop-image-storage.sql` | Required for shop uploads: adds `image_url`/`image_path` and makes legacy `image_data` nullable. |
| `db/004-drop-shop-image-data.sql` | Destructive cleanup of legacy image bytes. Run only after `script/migrate-shop-images.mjs` has copied all existing images to Storage; it includes a guard but still drops the column. |
| `db/005-rate-limit.sql` | Required for OTP request throttling; creates the RLS-protected `rate_limits` table. |
| `db/006-market.sql` | Required for current market-based owner setup. Depends on base schema and migration 003; creates market/category/location tables and enables RLS on those tables. |
| `db/seed/para-market.sql` | Optional placeholder data; run after migration 006. |
| `db/enable-rls.sql` | Separate guarded step to enable RLS on base account/shop tables. Its guard requires the executing DB role to bypass RLS or be superuser. Do not bypass/remove that guard casually. |

The live development database was checked during this update: it contained the market tables, 1 available draft/active market, 8 categories, and 48 stalls. Local SQL files do not prove that another database or deployment has had the migrations applied.

The `postgres` client in `src/app/lib/db/index.js` uses TLS, disables prepared statements, and applies `postgres.camel` to result column names (`shop_name` becomes `shopName`). SQL identifiers remain snake_case. Always use parameterized tagged SQL.

## Supabase Storage

- Bucket name: `shop-images`.
- Bucket is public so its `getPublicUrl()` image URLs can be rendered without signed URLs. Upload/delete use a server-side service key only.
- Accepted file types are `image/jpeg`, `image/png`, and `image/webp`; bucket and form limits are 2 MB.
- Server helper: `src/app/lib/storage/shop-images.js`.
- Provision or align the bucket and verify upload/delete using:

  ```bash
  node --env-file=.env.local script/ensure-shop-image-bucket.mjs
  ```

- For legacy database images, create/verify the bucket, run `node --env-file=.env.local script/migrate-shop-images.mjs`, verify migration results, then consider migration 004.
- `next.config.mjs` derives the remote image hostname from `SUPABASE_URL` and allows Next Image qualities `[72, 75, 82]`. Add any newly used quality to `images.qualities` and restart the server after changing Next config.

## Setup and environment

### Prerequisites

- Node.js 20.6 or later (`--env-file` is used by utility commands).
- Supabase project with PostgreSQL and Storage.
- Resend account and a verified sender address for signup email.
- GitHub OAuth app if GitHub sign-in is needed.

### Local setup

1. Install dependencies: `npm install`.
2. Create `.env.local` in the project root. Never commit it or print its values.
3. Apply `db/schema.sql` and the required migrations above using Supabase SQL Editor.
4. Configure the bucket with `node --env-file=.env.local script/ensure-shop-image-bucket.mjs`.
5. Check database connectivity with `node --env-file=.env.local script/test-db.mjs`.
6. Start the app with `npm run dev` and open `http://localhost:3000`.

### Environment variable names

| Name | Use |
|---|---|
| `DATABASE_URL` | PostgreSQL connection URL. Use a session pooler locally and a transaction pooler for serverless deployment; special password characters must be URL-encoded. |
| `AUTH_SECRET` | Auth.js signing secret and HMAC key for OTP/rate-limit identifiers. |
| `GITHUB_CLIENT_ID`, `GITHUB_SECRET` | GitHub OAuth credentials. Local callback example: `http://localhost:3000/api/auth/callback/github`. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Signup verification email. |
| `SUPABASE_URL` | Supabase project URL; also supplies the remote image hostname. |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Server-side Storage admin key. Never expose to the browser. |
| `OTP_DAILY_EMAIL_LIMIT` | Optional global signup email cap; defaults to 100/day. |

## Scripts and verification

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Create a production build. Google Fonts referenced by `next/font` must be reachable during a clean build. |
| `npm start` | Run a production build. |
| `node --env-file=.env.local script/test-db.mjs` | Connect to PostgreSQL and list public tables. |
| `node --env-file=.env.local script/ensure-shop-image-bucket.mjs` | Create/align the image bucket and test a temporary upload/delete. |
| `node --env-file=.env.local script/migrate-shop-images.mjs` | Backfill legacy shop images to Storage before dropping `image_data`. |

There is no automated test framework configured. During the recent owner setup update, `npm run lint` passed with one existing warning in `src/app/lib/auth/auth.config.js`; `npm run build` passed after network access to Google Fonts was available. A database smoke check verified the market data tables/seed counts. A full browser form submission requires a signed-in test account.

## Troubleshooting history

| Symptom | Root cause | Resolution |
|---|---|---|
| Owner setup showed a blocking-prerender warning at `auth()` | Request-bound session reads were mixed with a route being prerendered while `cacheComponents` was enabled. | Keep session reads in a streamed child under `Suspense`; call `connection()` before request-dependent work, as in `src/app/owner/setup/page.js`. |
| Next build rejected a route `runtime` setting | The project has `cacheComponents`, which is incompatible with that route-segment setting. | Remove the incompatible `runtime` export; keep the handler on the supported default Node runtime. |
| Shop submit returned generic 500 for storage failures | The API expected a `STORAGE_UPLOAD_FAILED` prefix but the helper threw a different message. | Use typed `ShopImageStorageError` instances and map configuration/upload errors to safe, actionable 503/502 responses. |
| Shop image save returned `Bucket not found` / 502 | The required `shop-images` bucket did not exist in Supabase. | Create/align it with the setup script; the script verifies a temporary upload and delete. |
| Next Image warned that quality 72 was not configured | `next/image` quality values must be allowlisted in config. | Configure `[72, 75, 82]` in `images.qualities`. |
| Shop save failed against an old DB schema | The shop-image and market flows depend on `image_url`, `image_path`, `market_id`, and market/category relation tables. | Apply migrations 003 and 006. The shop API responds with a schema hint for missing table/column errors. |
| Owner form dropped all but one selected category | `Object.fromEntries(FormData.entries())` keeps only one value for a repeated key. | Use `shopFormToObject()` and `formData.getAll("categoryIds")`; validate and save up to three category IDs. |
| Build failed fetching Geist fonts | `next/font/google` fetches Google Fonts at build time; restricted/offline network prevented the request. | Restore build-time access or self-host fonts if the deployment environment cannot access Google Fonts. |
| An image hostname in Next config contained a database connection string | The wrong value was used as `images.remotePatterns.hostname`. | Derive the host from `SUPABASE_URL`. If the connection string was shared or committed, rotate its database password. |

## Routes

| Route | Purpose |
|---|---|
| `/` | Animated landing page. |
| `/choose-role/signup`, `/choose-role/login` | Owner/user choice. |
| `/signup?role=user`, `/signup?role=owner` | Signup form. |
| `/login` | Login form. |
| `/owner/setup` | Authenticated business profile setup. |
| `/dashboard/Home` | Dashboard placeholder. |
| `POST /api/signup/request-otp` | Validate, rate-limit, stage signup, send OTP. |
| `POST /api/signup/verify-otp` | Verify OTP and create the account. |
| `POST /api/owner/shop` | Validate and save shop, stall, categories, owner role, and image metadata. |
| `GET /api/owner/shop/options?marketId=...` | Authenticated market stall options for owner setup. |
| `/api/auth/[...nextauth]` | Auth.js handlers. |

## Project layout

```text
db/                         Base schema and ordered SQL migrations
db/seed/                    Placeholder market seed data
script/                     Database/Storage setup and migration utilities
public/                     Market background and static assets
proxy.js                    Signed-out route redirects
src/app/
  api/auth/                  Auth.js route handler
  api/signup/                OTP request/verification endpoints
  api/owner/shop/            Shop save and stall options endpoints
  choose-role/               Login/signup role selection pages
  components/                Landing, auth, owner form, and animation components
  dashboard/Home/            Dashboard placeholder
  lib/auth/                  Auth.js config, OTP, password, and role helpers
  lib/db/                    PostgreSQL client
  lib/markets.js             Market/stall/category/public-shop queries
  lib/rate-limit.js          OTP rate limiting
  lib/shops/owner-shop.js    Owner shop validation and transactional persistence
  lib/storage/               Supabase Storage helpers
  lib/validation/            Shared shop form schema and FormData helpers
  owner/setup/               Owner setup page
```

## Remaining work

- Public market directory UI, search/filter page, and interactive map.
- Replace placeholder market/stall data with verified survey data; activate a market only after its layout is confirmed.
- Owner dashboard for editing shop profile, catalog, opening status, and offers.
- Worker profile activation, age/identity verification, shift creation/applications, attendance/check-in, payments, and ratings.
- Admin review interface for verifying/rejecting shops and activating markets.
- Add automated tests for validation, role authorization, stall contention, image cleanup, and OTP limits.
