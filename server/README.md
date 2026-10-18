# Jettigo API

Backend for the Jettigo private-aviation platform: sign-in, search and quotes, bookings, trips, concierge chat, the corporate console and the operator portal.

**Stack:** Node.js 20+, TypeScript, Fastify 5, Drizzle ORM, PostgreSQL. Local development and tests use [PGlite](https://pglite.dev), a full Postgres build embedded in Node, so no database install is needed.

## Run locally

```bash
cd server
npm install
cp .env.example .env    # optional: defaults work for local development
DEMO_OTP=true SEED_DEMO=true npm run dev
```

The API listens on `http://localhost:8787`. Open the prototype in live mode at `http://localhost:8765/app/?live=1` (serve the repo root with any static server, e.g. `python3 -m http.server 8765`).

Demo accounts (sign in with a one-time code; with `DEMO_OTP=true` the code is returned by the API):

| Email | Role |
|---|---|
| `james@thompson.co` | Passenger, corporate admin (Thompson Holdings) |
| `john@thompson.co` | Corporate traveler |
| `ops@rivieraair.com` | Approved operator (Riviera Air Charter) |
| `admin@jettigo.app` | Platform admin (approves partners) |

Any other email creates a new passenger account.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with reload (PGlite in `./.pglite` unless `DATABASE_URL` is set) |
| `npm test` | Run the API test suite against in-memory Postgres |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm run db:generate` | Generate a SQL migration after changing `src/db/schema.ts` |
| `npm run seed` | Load demo operators, fleet and accounts into an empty database |

Migrations in `drizzle/` run automatically on startup.

## Configuration

| Variable | Required in production | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | 32+ characters; signs session tokens |
| `PII_KEY` | Yes | 32+ characters; encrypts passport numbers (AES-256-GCM) |
| `CORS_ORIGINS` | Yes | Comma-separated allowed web origins |
| `DEMO_OTP` | No | `true` returns one-time codes in the response (no email provider yet) |
| `SEED_DEMO` | No | `true` loads demo data when the database is empty |

## API overview (`/v1`)

All responses are JSON. Errors use `{ "error": { "code", "message", "details" } }`. Authenticated routes need `Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/otp` · `POST /auth/verify` |
| Catalog | `GET /airports` · `GET /amenities` · `GET /fleet` · `GET /membership/tiers` · `GET /ground/vehicles` |
| Search | `POST /search` (guest or signed in) · `GET /quote-requests/:id` |
| Bookings | `POST /bookings` · `GET /bookings` · `GET /bookings/:id` · `PUT /bookings/:id/travelers` · `POST /bookings/:id/travelers/:n/verify` · `PUT /bookings/:id/amenities` · `POST /bookings/:id/pay` · `GET /bookings/:id/live` · `POST /bookings/:id/ground` |
| Concierge | `GET /messages` · `POST /messages` |
| Corporate | `GET /company` · `GET/POST /company/members` · `PATCH /company/members/:id` · `GET /company/bookings` · `GET /company/invoices` · `GET /company/report?from&to&format=csv` · `GET /company/documents` · `GET /company/documents/manifest/:id` |
| Partners | `POST /partners/apply` · `GET /partners/applications/:id` |
| Operator | `GET /operator/me` · `GET/POST /operator/aircraft` · `PATCH /operator/aircraft/:id` · `GET /operator/requests` · `POST /operator/quotes/:id/respond` |
| Admin | `GET /admin/operators` · `POST /admin/operators/:id/decision` |
| Account | `GET/PATCH /me` · `POST /me/membership` · `GET /me/referral` |

## How it works

- **Quotes**: a search prices every eligible aircraft (enough seats, range with a 10% reserve, approved operator) from great-circle distance, cruise speed and hourly rate. Quotes hold for 30 minutes. Operators can confirm, counter (50–300% of standard) or decline.
- **Bookings**: draft → travelers added and identity-verified → amenities → payment. Payment claims the draft atomically, so a booking can only be paid once; flight-credit payments debit the company balance in the same transaction and roll back if credits are short.
- **Security**: one-time codes are stored as HMAC hashes, expire in 10 minutes, lock after 5 wrong tries and are rate-limited per IP and per email. Roles and company membership are read from the database on every request, not trusted from the token. Passport numbers are encrypted at rest and only the last 4 digits are ever returned. CSV exports neutralise spreadsheet formula injection.

## Not production-complete yet (by design for this MVP)

| Area | Current state | Next step |
|---|---|---|
| Payments | Mock provider: card succeeds, wire is pending | Razorpay or Stripe in test mode, then live |
| Email / SMS | One-time codes are logged or returned in demo mode | Connect an email provider (e.g. Resend, SES) and disable `DEMO_OTP` |
| Identity checks | Verify endpoint marks a traveler verified | Passport OCR + selfie match provider |
| Flight tracking | Status and position simulated from the schedule | ADS-B / FlightAware feed |
| Concierge | Rule-based placeholder replies | Concierge desk tool for the 24/7 team |
| SSO, Apple, Google sign-in | Not implemented | OIDC / SAML |
| Document uploads | Not stored | Object storage (S3/R2) with signed URLs |

## Deployment and review notes

- `TRUST_PROXY_HOPS` defaults to `0` (direct local connections). The Render Blueprint sets `1`, trusting only the nearest proxy hop rather than arbitrary forwarded prefixes. Confirm the actual ingress chain when changing hosting or adding a CDN.
- `DATABASE_SSL` defaults to `true`: external PostgreSQL connections verify server certificates; URL SSL flags cannot disable verification. The Blueprint sets `false` only because `fromDatabase.connectionString` is Render's **private network** URL. Do not use that setting with an external database URL. See [Render connection documentation](https://render.com/docs/postgresql-creating-connecting).
- Live flight selection/display uses **UTC**, explicitly labeled in the route picker. Demo mode retains its existing local-time presentation.
- OTP issuance and verification serialize in a short database transaction, including failed-attempt increments. This intentionally trades OTP throughput for correctness in this single-service MVP.
- Booking creation, operator responses and payments lock the quote request first. Traveler/amenity updates lock the booking. Payment rechecks the request, current price, expiry and verified travelers within the transaction. All transactional queries use the transaction handle, including on PGlite.
- A masked traveler passport may be omitted when editing an existing position; the server retains that position's encrypted passport and rechecks identity fields. New travelers still require a passport.
- `DEMO_OTP=true` intentionally allows anyone to obtain a code for any email, including seeded privileged accounts. This deployment is a public **demo**, and must use synthetic personal data and mock balances. Disable demo codes and connect an actual delivery provider before authenticating real customers.
- Mock wire payments remain pending; no transfer instructions or confirmation emails are sent. Seed data is transactional and repeat-safe. Shutdown drains HTTP before closing the database, with a 15-second deadline.
- The in-memory PGlite tests exercise concurrent API requests, but its single connection serializes transactions. Validate contention and ingress/TLS behavior on Render PostgreSQL before a real customer rollout; no hosted environment is exercised by this test suite.
