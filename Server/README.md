# KhelSpot Server

Booking API for KhelSpot: Node 22, Fastify 5, TypeScript, PostgreSQL through Prisma 7, zod for input validation, vitest for tests. Launch city: Lahore.

## Setup

```bash
npm install
cp .env.example .env
npm run db:up        # Postgres 17 in Docker on localhost:5433 (also creates khelspot_test)
npm run db:migrate   # apply migrations
npm run db:seed      # the four Lahore launch venues
npm run dev          # http://localhost:4000, reloads on change
```

`npm run db:up` needs Docker running (Docker Desktop, or the Docker engine). The compose file mounts nothing from your disk, so it works from any drive. To use another Postgres instead, point `DATABASE_URL` (and `TEST_DATABASE_URL`) in `.env` at it; the `btree_gist` extension must be available, which it is in standard Postgres builds.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | API with live reload |
| `npm start` | API without reload |
| `npm test` | Domain tests always; API tests when `TEST_DATABASE_URL` is reachable (they wipe that database's bookings) |
| `npm run build` | Type-check |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations (production, CI) |
| `npm run db:seed` | Upsert the launch venues, courts and rates; safe to re-run, never touches bookings |
| `npm run db:reset` | Drop everything, migrate, seed |

## API

All responses are JSON. Errors look like `{ "error": { "code": "SLOT_TAKEN", "message": "...", "details": [...] } }`, with codes the Frontend can switch on.

### Players

| Method and path | Notes |
|---|---|
| `GET /health` | Checks the database connection |
| `GET /venues?area=&sport=&city=` | Lahore venues with courts, rates and cancellation policy |
| `GET /venues/:slug` | One venue |
| `GET /venues/:slug/availability?date=YYYY-MM-DD&courtId=` | Each court's hours as `free`, `booked`, `past` or `no-rate`, with price. `date` defaults to today's operating day |
| `POST /bookings` | `{ venueId, courtId, date, start, hours, customer: { name, phone }, payment }`. Price is computed on the server; returns 409 `SLOT_TAKEN` if the time is gone |
| `GET /bookings/:ref?phone=` | A booking, only for the phone number that made it |
| `POST /bookings/:ref/cancel` | `{ phone }`. Refund follows the venue's policy |

### Venue owners (no login yet, see below)

| Method and path | Notes |
|---|---|
| `GET /owner/venues/:id` | Venue with its settings |
| `GET /owner/venues/:id/bookings?from=&to=&status=` | Up to 92 days, cancelled included unless filtered |
| `GET /owner/venues/:id/customers` | Players from the last 90 days and next 14: games, hours, spend, last and next visit |
| `PUT /owner/venues/:id/settings` | Opening hours, rate bands per sport, cancellation policy, pay at venue. Rejects overlapping or missing rates |
| `POST /owner/bookings` | Walk-in or phone booking; add `"paid": true` for cash already taken |
| `GET /owner/bookings/:ref` | Any booking at the venue |
| `POST /owner/bookings/:ref/mark-paid` | Cash collected |
| `POST /owner/bookings/:ref/cancel` | Venue cancels; the player is refunded in full |

## How time works

Venues run past midnight, so hours are counted from midnight of the **operating day** and can go past 24: a venue open 4 PM to 4 AM has `openHour 16`, `closeHour 28`, and Friday's 1 AM slot is `date: Friday, start: 25`. The operating day turns over at 6 AM. The server runs on Lahore time (`TZ=Asia/Karachi`, set in `src/env.ts`), so "now", "today" and refund windows match the venue's clock wherever the server is hosted. `formatWhen()` in `src/domain/time.ts` prints the real calendar date for after-midnight slots.

## Double booking

Bookings are checked inside a transaction, and the database has the final say: the `booking_no_overlap` exclusion constraint (in the first migration) turns each confirmed booking into an hour range and refuses any overlap on the same court, including across midnight and between two requests that arrive at the same moment. The API turns that refusal into a 409 `SLOT_TAKEN`.

## Layout

```
prisma/
  schema.prisma        tables: venues, courts, rate_bands, customers, bookings
  migrations/          SQL migrations (the first adds the overlap and check constraints by hand)
  seed.ts, seed-data.ts  Lahore launch venues (copied from Frontend/src/lib/catalog/venues.ts)
src/
  env.ts               .env loading, Lahore timezone, config
  db.ts                Prisma client with the pg driver adapter
  app.ts               Fastify app, error handling, route registration
  server.ts            starts the HTTP server
  domain/              types, time and pricing, copied from Frontend/src/lib/domain (keep in sync)
  http/                zod schemas, ApiError
  routes/              public.ts (players), owner.ts (venue owners)
  services/            bookings.ts, venues.ts, mappers.ts (database rows -> Frontend shapes)
test/
  domain.test.ts       prices, refunds, after-midnight dates, slot grid, settings checks
  api.test.ts          every route against a real database
```

## Not done yet

- **Accounts.** Owner routes are open (marked `TODO(auth)` in `src/routes/owner.ts`); players identify a booking by ref plus phone number. Next: OTP login by phone for players and owners, and checking an owner manages the venue on every owner route.
- **Real payments.** `jazzcash`, `easypaisa` and `card` bookings are created as paid. Next: create the booking as pending, confirm it from the payment provider's callback, and release the slot if payment fails or times out.
- **Frontend wiring.** The Frontend still uses its in-browser demo store. Swap the actions in `Frontend/src/lib/store/store.ts` for calls to this API; the response shapes already match `Frontend/src/lib/domain/types.ts`.
- **WhatsApp/SMS confirmations**, rate limiting, and deployment.
