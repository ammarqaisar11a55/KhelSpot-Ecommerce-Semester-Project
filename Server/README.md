# KhelSpot Server

Booking API for KhelSpot: Node 22, Fastify 5, TypeScript, PostgreSQL through Prisma 7, zod for input validation, vitest for tests. Launch city: Lahore.

## Setup

```bash
npm install
cp .env.example .env
npm run db:up        # Postgres 17 in Docker on localhost:5433 (also creates khelspot_test)
npm run db:migrate   # apply migrations
npm run db:seed      # the four Lahore launch venues, plus OWNER_PHONES
npm run dev          # http://localhost:4000, reloads on change
```

`npm run db:up` needs Docker running (Docker Desktop, or the Docker engine). The compose file mounts nothing from your disk, so it works from any drive. To use another Postgres instead, point `DATABASE_URL` (and `TEST_DATABASE_URL`) in `.env` at it; the `btree_gist` extension must be available, which it is in standard Postgres builds.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | API with live reload |
| `npm start` | API without reload |
| `npm test` | Domain tests always; API tests when `TEST_DATABASE_URL` is reachable (they wipe that database's bookings and sign-ins) |
| `npm run build` | Type-check |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations (production, CI) |
| `npm run db:seed` | Upsert the launch venues, courts, rates and `OWNER_PHONES`; safe to re-run, never touches bookings |
| `npm run db:reset` | Drop everything, migrate, seed |

## API

All responses are JSON (except the test payment page). Errors look like `{ "error": { "code": "SLOT_TAKEN", "message": "...", "details": [...] } }`, with codes clients can switch on. Signed-in calls send `Authorization: Bearer <token>`.

### Sign-in (players and owners)

| Method and path | Notes |
|---|---|
| `POST /auth/otp` | `{ phone }`. Sends a 6-digit code: 204. With `OTP_DEV_ECHO=1` outside production, or on a demo deployment that also sets `ALLOW_DEMO_OTP=1`: 200 `{ devCode }`. More than 3 codes to one number in 10 minutes: 429 `TOO_MANY` |
| `POST /auth/verify` | `{ phone, code }` -> `{ token, user }`. Wrong: 400 `CODE_WRONG` (message says tries left). Expired, replaced or 5 wrong tries: 400 `CODE_EXPIRED` |
| `POST /auth/logout` | Ends this token's session: 204 |
| `GET /me` | `{ user }`: `{ phone, name, ownerOf: [{ venueId, slug, name }] }`. No valid token: 401 `UNAUTHENTICATED` |
| `PATCH /me` | `{ name }` -> `{ user }` |
| `GET /me/bookings` | `{ bookings }`: every booking made with this phone, newest date first, cancelled included, each with `venue: { id, slug, name, area }` |

### Players

| Method and path | Notes |
|---|---|
| `GET /health` | Checks the database; also names the payment and SMS providers in use |
| `GET /venues?area=&sport=&city=` | Lahore venues with courts, rates, cancellation policy and photo |
| `GET /venues/:slug` | One venue |
| `GET /venues/:slug/availability?date=YYYY-MM-DD&courtId=` | Each court's hours as `free`, `booked`, `past` or `no-rate`, with price. Payment holds count as booked. `date` defaults to today's operating day |
| `POST /bookings` | `{ venueId, courtId, date, start, hours, customer: { name, phone }, payment, returnUrl? }`. No sign-in needed. Price is computed on the server. `cash`: 201 `{ booking }`, confirmed and unpaid. `jazzcash`/`easypaisa`/`card`: 201 `{ booking, checkout: { url } }` with the booking `pending_payment` until paid (see Payments). 409 `SLOT_TAKEN` if the time is gone |
| `GET /bookings/:ref?phone=` | A booking, only for the phone that made it. Signed in, the token can stand in for `phone` |
| `POST /bookings/:ref/cancel` | `{ phone }` (or the token). Refund follows the venue's policy; a payment hold is released with nothing to refund |

Booking `status` is `pending_payment`, `confirmed` or `cancelled`. Pending bookings also carry `holdExpiresAt`.

### Venue owners

Every owner route needs a token whose phone is listed for that venue in `venue_owners`: 401 `UNAUTHENTICATED` without a valid token, 403 `NOT_YOUR_VENUE` for any other venue. For `/owner/bookings/:ref` routes the venue is the booking's; for `POST /owner/bookings` it's `body.venueId`.

| Method and path | Notes |
|---|---|
| `GET /owner/venues/:id` | Venue with its settings |
| `GET /owner/venues/:id/bookings?from=&to=&status=` | Up to 92 days, payment holds and cancellations included unless filtered |
| `GET /owner/venues/:id/customers` | Players from the last 90 days and next 14: games, hours, spend, last and next visit |
| `PUT /owner/venues/:id/settings` | Opening hours, rate bands per sport, cancellation policy, pay at venue. Rejects overlapping or missing rates |
| `POST /owner/bookings` | Walk-in or phone booking, confirmed at once; add `"paid": true` for cash already taken |
| `GET /owner/bookings/:ref` | Any booking at the venue |
| `POST /owner/bookings/:ref/mark-paid` | Cash collected. 409 `PENDING_PAYMENT` while the player is paying online |
| `POST /owner/bookings/:ref/cancel` | Venue cancels; the player is refunded in full |

### Test payments (only when `PAYMENT_PROVIDER=test`)

| Method and path | Notes |
|---|---|
| `GET /pay/test/:ref` | HTML page: "Test payment, no money moves", the amount, and Pay / Cancel buttons |
| `POST /pay/test/:ref/pay` | Confirms the booking and marks it paid |
| `POST /pay/test/:ref/cancel` | Releases the hold (booking cancelled) |

Both POSTs then redirect (303) to `returnUrl?ref=REF&status=paid|cancelled` when the booking was made with an allowed `returnUrl`, or show a "You can close this page" result otherwise.

## Sign-in

One flow for players and owners: phone number, then a 6-digit code by SMS.

- Codes expire after 5 minutes, allow 5 tries, and only the newest one works. A number gets at most 3 codes per 10 minutes. Only an HMAC of the code (keyed with `OTP_SECRET`) is stored.
- A successful sign-in returns a random 32-byte token (base64url) valid for 90 days. Only its SHA-256 hash is stored, in `sessions`.
- SMS goes through `src/services/sms.ts`. The only provider so far is `console`, which writes codes to the server log. For local work set `OTP_DEV_ECHO=1` to get the code back from `POST /auth/otp`; it's ignored in production.
- Owners: `venue_owners` links phone numbers to venues. Put real numbers in `OWNER_PHONES` (for example `v-night-owl:03001112233,v-baseline:03002223344`) and run `npm run db:seed`. An owner signs in like a player and sees their venues in `user.ownerOf`.

## Payments

Online payments (JazzCash, Easypaisa, card) go through a provider chosen with `PAYMENT_PROVIDER`:

1. `POST /bookings` creates the booking as `pending_payment` with `holdExpiresAt` 10 minutes ahead, and returns `checkout.url` from the provider.
2. The hold blocks the slot like a confirmed booking. When it expires the booking is cancelled and the slot is free again (expired holds are released before every availability check and booking).
3. The provider reports back: paid confirms the booking (`paid: true`); failed or abandoned cancels it.

`test` is the only working provider, and the default outside production. In production the server refuses to start without a real provider, unless `ALLOW_TEST_PAYMENTS=1` is set for a demo deployment. `src/services/payments/jazzcash.ts` and `easypaisa.ts` are stubs listing what each integration needs and the environment variables it will read; neither is wired in.

`returnUrl` must match `PAYMENT_RETURN_ALLOW`: an entry ending in `://` allows that scheme (`khelspot://`), anything else must be an exact origin (`http://localhost:3000`). Other URLs are ignored.

## How time works

Venues run past midnight, so hours are counted from midnight of the **operating day** and can go past 24: a venue open 4 PM to 4 AM has `openHour 16`, `closeHour 28`, and Friday's 1 AM slot is `date: Friday, start: 25`. The operating day turns over at 6 AM. The server runs on Lahore time (`TZ=Asia/Karachi`, set in `src/env.ts`), so "now", "today" and refund windows match the venue's clock wherever the server is hosted. `formatWhen()` in `src/domain/time.ts` prints the real calendar date for after-midnight slots.

## Double booking

Bookings are checked inside a transaction, and the database has the final say: the `booking_no_overlap` exclusion constraint turns each booking that isn't cancelled (confirmed, or an unexpired payment hold) into an hour range and refuses any overlap on the same court, including across midnight and between two requests that arrive at the same moment. The API turns that refusal into a 409 `SLOT_TAKEN`.

## Layout

```
prisma/
  schema.prisma        venues, courts, rate_bands, customers, bookings, users, sessions, otp_codes, venue_owners
  migrations/          SQL migrations (overlap and check constraints are added by hand)
  seed.ts, seed-data.ts  Lahore launch venues (copied from Frontend/src/lib/catalog/venues.ts) and OWNER_PHONES
src/
  env.ts               .env loading, Lahore timezone, config
  db.ts                Prisma client with the pg driver adapter
  app.ts               Fastify app, error handling, route registration
  server.ts            starts the HTTP server
  domain/              types, time and pricing, copied from Frontend/src/lib/domain (keep in sync)
  http/                zod schemas, ApiError, bearer-token checks, return-URL allow-list
  routes/              public.ts (players), auth.ts (sign-in, /me), owner.ts (venue owners), pay-test.ts
  services/            bookings.ts (holds, payments), venues.ts, auth.ts, sms.ts, mappers.ts
  services/payments/   provider.ts (interface), test.ts, jazzcash.ts and easypaisa.ts (stubs)
test/
  domain.test.ts       prices, refunds, after-midnight dates, slot grid, settings checks
  api.test.ts          every route against a real database: sign-in limits, owner access, holds, test payments
```

## Not done yet

- **Real SMS.** Only the `console` provider exists; pick one and implement `SmsProvider` (`TODO(sms)` in `src/services/sms.ts`).
- **Real payments.** JazzCash and Easypaisa are stubs (`TODO(payments/...)`). Each needs a merchant account, its checkout, and a signed callback route that calls `confirmPayment` / `failPayment`.
- **Frontend wiring.** The web Frontend still uses its in-browser demo store. Its `Booking` type doesn't know `pending_payment` / `holdExpiresAt` yet.
- **WhatsApp confirmations**, request rate limiting beyond sign-in codes, and owner self-service (adding a venue or a co-owner from the app).
