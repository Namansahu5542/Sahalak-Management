# Sahalak

Sahalak connects local market businesses with people looking for flexible work. Businesses can find help for a short shift or a longer role; customers can explore local shops, and regular users can activate a worker profile when that experience is built out.

## Tech stack

- **Next.js 16 App Router** with React 19
- **Tailwind CSS 4** for page and component styling
- **Auth.js / NextAuth v5 beta** for GitHub OAuth, email/password credentials, and JWT sessions
- **MongoDB** accessed through **Mongoose 9** models
- **Zod 4** for shared client/server shop form validation
- **Resend Email API** for signup verification codes
- **Node.js crypto** for password hashing (`scrypt`) and OTP generation/digests

The project enables Next.js `cacheComponents`. The owner setup page keeps its static header and background outside a Suspense boundary and streams the session-dependent content inside it.

## Implemented so far

### Landing page

- Responsive Sahalak landing page focused on connecting businesses with workers for short and long periods.
- Animated market journey: the path draws as the visitor scrolls, nearby shops light up, and a person follows the route to the destination.
- Reduced-motion handling for visitors who prefer less animation.
- Home, business, worker, and sign-in/sign-up calls to action.

### Sign-in and signup

- Role selection offers two account types: `owner` and `user`.
- Signup is available at `/signup?role=user` or `/signup?role=owner`.
- Email/password signup collects a name and verifies the email before creating the account.
- Verification codes are 8 digits, expire after 10 minutes, allow up to 5 attempts, and have a 60-second resend cooldown.
- Passwords are stored as `scrypt` hashes. OTPs are stored as keyed digests, not as the original code.
- Signup can also continue with GitHub OAuth.
- Credentials and GitHub sign-in use JWT sessions through Auth.js.

### Owner shop setup

- `/owner/setup` provides the owner business setup form and market-route animation.
- Fields include shop name, market, address, category, contact number, and a shop image/logo.
- The same Zod schema validates the form in the browser and on the server. The API also checks the uploaded file signature and accepts JPG, PNG, or WebP images up to 2 MB.
- `POST /api/owner/shop` requires a signed-in account, saves the shop through the Mongoose `ShopDetails` model, and activates the account’s `owner` role.
- The model writes to the MongoDB collection named **`Shop_details`**. It currently allows one profile per owner email; submitting again updates that profile.
- The image is stored as binary in the shop document. For larger production image workloads, move image files to object storage and keep only their URLs/keys in MongoDB.

### Protected routes

The root `proxy.js` redirects signed-out visitors to the login role-choice page when they visit `/owner/setup`, `/dashboard/*`, `/owner/dashboard/*`, or `/worker/dashboard/*`.

## Main routes and API

| Path | Purpose |
| --- | --- |
| `/` | Sahalak landing page |
| `/choose-role/signup` | Choose an account type before signup |
| `/choose-role/login` | Choose an account type before login |
| `/signup?role=user` | Customer/worker-capable user signup |
| `/signup?role=owner` | Owner signup, followed by shop setup |
| `/owner/setup` | Owner shop profile setup |
| `/dashboard/Home` | Dashboard route (currently a placeholder page) |
| `/api/auth/[...nextauth]` | Auth.js handlers |
| `POST /api/signup/request-otp` | Create/update a pending signup and email a code |
| `POST /api/signup/verify-otp` | Verify the code and create the account |
| `POST /api/owner/shop` | Validate and save shop details |

## MongoDB models

Models live under `src/app/lib/models/`:

- **`User`** — name, email, password hash when applicable, role, email verification, and owner activation fields; collection: `users`.
- **`PendingSignup`** — temporary signup data and OTP digest with an expiry index; collection: `pendingSignups`.
- **`ShopDetails`** — owner reference, shop details, image data, and Mongoose timestamps; collection: `Shop_details`.

Mongoose connects using `MONGODB_URI` in `src/app/lib/db/mongoose.js`. The database name comes from that connection URI.

## Local setup

Install the dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful scripts:

```bash
npm run dev
npm run lint
npm run build
npm start
```

## Environment variables

Create a local `.env.local` in the project root. Do not commit it or expose these values in client-side code.

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority

# Set AUTH_SECRET, or keep using BETTER_AUTH_SECRET as the existing fallback.
AUTH_SECRET=<long-random-secret>

GITHUB_CLIENT_ID=<github-oauth-client-id>
GITHUB_SECRET=<github-oauth-client-secret>

RESEND_API_KEY=re_<resend-api-key>
EMAIL_FROM="Sahalak <verify@your-verified-domain.com>"
```

For email delivery, verify the sending domain/address with Resend and use a sender that Resend permits. The OTP endpoint returns a setup error if `RESEND_API_KEY` or `EMAIL_FROM` is missing.

For GitHub OAuth, configure the GitHub OAuth application callback URL to match the Auth.js endpoint for your environment, such as `http://localhost:3000/api/auth/callback/github` locally.

## Project structure

```text
src/app/
  api/
    auth/[...nextauth]/     Auth.js route handlers
    owner/shop/             Shop setup API
    signup/                 Email OTP signup APIs
  choose-role/              Login and signup role choices
  components/               Landing, signup, animation, and shop form UI
  dashboard/Home/           Dashboard placeholder
  lib/
    auth/                   Auth.js config, password and OTP helpers
    db/                     Mongoose connection
    models/                 User, PendingSignup, ShopDetails
    validation/             Shared Zod shop form schema
  owner/setup/              Owner business setup page
  signup/                   Signup page
public/
  market.webp               Market photo used by the signup/setup experience
proxy.js                    Protected route redirects
```

## Current scope and next steps

- The dashboard page is still a placeholder; shift posting, worker search, and business management screens are not implemented yet.
- The role-choice copy describes user/worker activation, but a complete worker profile flow is still future work.
- Shop setup promotes the signed-in account to `owner` after a valid shop profile is saved. Add stricter authorization rules if owner operations later require approval or verification.
- Add IP-based rate limiting and production monitoring for signup/OTP endpoints before a public launch.
- There is no automated test script configured in `package.json` yet.
