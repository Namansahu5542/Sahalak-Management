# Sahalak

Sahalak connects local market businesses with people looking for flexible work. Businesses can find help for a short shift or a longer role, customers can explore local shops, and regular users can activate a worker profile when that experience is built out.

> Status: in active development. The landing page, authentication and owner shop setup are working. The market directory, map and staffing features are planned (see the roadmap).

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 (App Router) with React 19 |
| Styling | Tailwind CSS 4 |
| Authentication | Auth.js / NextAuth v5 beta: GitHub OAuth, email and password, JWT sessions |
| Database | PostgreSQL (hosted on Supabase), accessed with the `postgres` library and plain SQL |
| Validation | Zod 4, shared by the browser and the server for the shop form |
| Email | Resend API for signup verification codes |
| Security helpers | Node.js `crypto`: scrypt password hashing, HMAC-based OTP digests |

The project enables Next.js `cacheComponents`. The owner setup page keeps its static header and background outside a `Suspense` boundary and streams the session-dependent content inside it.

## Implemented so far

### Landing page
- Responsive landing page for connecting businesses with workers for short and long periods.
- Animated market journey: the path draws as the visitor scrolls, nearby shops light up, and a person follows the route to the destination.
- Reduced-motion handling for visitors who prefer less animation.
- Calls to action for home, business, worker, and sign-in or sign-up.

### Sign-in and signup
- Role selection offers two account types: owner and user.
- Signup is available at `/signup?role=user` or `/signup?role=owner`.
- Email and password signup collects a name and verifies the email before creating the account.
- Verification codes are 8 digits, expire after 10 minutes, allow up to 5 attempts, and have a 60-second resend cooldown.
- Passwords are stored as scrypt hashes. OTPs are stored as keyed digests, never as the original code.
- Signup can also continue with GitHub OAuth.
- Credentials and GitHub sign-in both use JWT sessions through Auth.js.

### Owner shop setup
- `/owner/setup` provides the business setup form with a market-route animation.
- Fields: shop name, market, address, category, contact number, and a shop image or logo.
- One Zod schema validates the form in the browser and on the server. The API also checks the uploaded file signature and accepts JPG, PNG or WebP images up to 2 MB.
- `POST /api/owner/shop` requires a signed-in account. In a single database transaction it activates the owner role and saves (or updates) the shop.
- Each owner currently has one shop profile. Submitting again updates it.

### Protected routes
The root `proxy.js` redirects signed-out visitors to the login role-choice page when they visit `/owner/setup`, `/dashboard/*`, `/owner/dashboard/*`, or `/worker/dashboard/*`.

## Getting started

### Prerequisites
- Node.js 20.6 or later (the test script uses `--env-file`)
- A PostgreSQL database. The project is set up for Supabase (a free project works for development)
- A Resend account with a verified sending address, for verification emails
- A GitHub OAuth app, if you want GitHub sign-in

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Supabase project, open the SQL Editor, paste the contents of `db/schema.sql`, and run it.
3. Create `.env.local` in the project root (see the next section). Do not commit it.
4. Check the database connection:
   ```bash
   node --env-file=.env.local script/test-db.mjs
   ```
   It should print the database name and the list of tables.
5. Start the development server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. Never expose these in client-side code.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. For local development use the Supabase session pooler string. For serverless hosting (for example Vercel) use the transaction pooler string |
| `AUTH_SECRET` | Long random secret used by Auth.js and to key OTP digests |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_SECRET` | GitHub OAuth app client secret |
| `RESEND_API_KEY` | Resend API key for sending verification codes |
| `EMAIL_FROM` | Sender address, for example `Sahalak <verify@your-verified-domain.com>` |

If your database password contains special characters such as `@`, `#`, `/` or `:`, URL-encode them in `DATABASE_URL`.

For GitHub OAuth, set the app's callback URL to the Auth.js endpoint for your environment, for example `http://localhost:3000/api/auth/callback/github` locally.

The OTP endpoint returns a setup error if `RESEND_API_KEY` or `EMAIL_FROM` is missing.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run lint` | Run the linter |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `node --env-file=.env.local script/test-db.mjs` | Check the database connection and list tables |

## Database

The schema lives in `db/schema.sql`. Tables:

| Table | Purpose |
|---|---|
| `users` | Name, email, password hash (null for GitHub-only accounts), role (`user` or `owner`), email verification time, owner activation time |
| `pending_signups` | Temporary signup data and the OTP digest, with an expiry time and an attempt counter |
| `shops` | One shop per owner: owner, shop details, and the image |

Notes:
- The `postgres` client in `src/app/lib/db/index.js` converts snake_case columns to camelCase in JavaScript (`password_hash` becomes `passwordHash`).
- PostgreSQL does not delete expired rows automatically. The request-OTP route removes expired pending signups each time it runs.
- GitHub sign-ins get a `users` row the first time they save a shop.
- Shop images are currently stored as `bytea` in the `shops` table. Before building shop listing pages, move them to object storage (for example Supabase Storage) and keep only the URL in the table.
- Schema changes go into new numbered files in `db/` (for example `db/002-markets.sql`) so the database can always be rebuilt in order.

## Main routes and API

| Path | Purpose |
|---|---|
| `/` | Landing page |
| `/choose-role/signup` | Choose an account type before signup |
| `/choose-role/login` | Choose an account type before login |
| `/signup?role=user` | Customer or worker-capable user signup |
| `/signup?role=owner` | Owner signup, followed by shop setup |
| `/owner/setup` | Owner shop profile setup |
| `/dashboard/Home` | Dashboard route (currently a placeholder) |
| `/api/auth/[...nextauth]` | Auth.js handlers |
| `POST /api/signup/request-otp` | Create or update a pending signup and email a code |
| `POST /api/signup/verify-otp` | Verify the code and create the account |
| `POST /api/owner/shop` | Validate and save shop details |

## Project structure

```
db/
  schema.sql                 Database tables
script/
  test-db.mjs                Database connection check
public/
  market.webp                Market photo used by the signup and setup pages
proxy.js                     Protected route redirects
src/app/
  api/
    auth/[...nextauth]/      Auth.js route handlers
    owner/shop/              Shop setup API
    signup/                  request-otp and verify-otp APIs
  choose-role/               Login and signup role choices
  components/                Landing, signup, animation and shop form UI
  dashboard/Home/            Dashboard placeholder
  lib/
    auth/                    Auth.js config, password and OTP helpers
    db/                      PostgreSQL client
    validation/              Shared Zod shop form schema
  owner/setup/               Owner business setup page
  signup/                    Signup page
```

## Security notes
- Passwords are hashed with scrypt, and OTPs are stored only as keyed digests.
- Signup and shop endpoints check that requests come from the same origin.
- All database queries use parameters (never string concatenation).
- Keep `.env.local` out of Git, and use the transaction pooler string on serverless hosting.

## Known limitations
- Each owner can have one shop.
- Shop images are stored in the database for now.
- Authorization is checked only for session presence and the route redirects. Role and ownership checks inside each API route and page still need to be added as features grow.
- There is no admin role yet, so shops are not reviewed before they could be shown publicly.
- The dashboard is a placeholder.

## Roadmap

1. Housekeeping: database id for GitHub sessions, admin role, shop images in object storage.
2. Market directory data model: area, market, zone, lane, stall and category tables, with seed data for the first market.
3. Public market page with shop list, filters and search.
4. Interactive market map with clickable stalls.
5. Admin layout editor and lane-based directions to a shop.
6. Owner dashboard: edit shop, catalog items, open or closed today, offers.
7. Gig staffing: worker verification (18 or above), shift posting, applications, check-in, payment confirmation and ratings.