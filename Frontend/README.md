# KhelSpot Frontend

Next.js 16 (App Router, Cache Components) + TypeScript web app for KhelSpot: the landing page, the player booking flow and the venue owner dashboard.

## Commands

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (also type-checks)
npm run lint
```

## Routes

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/venues` | Find a court: filter by city, sport and day (filters live in the URL) |
| `/venues/[slug]` | Venue page: pick sport, court, day, start time and length |
| `/venues/[slug]/checkout` | Details, payment method, refund rules, simulated payment |
| `/bookings` | My bookings (upcoming, past and cancelled), cancel with refund quote |
| `/bookings/[ref]` | Booking confirmation and WhatsApp message preview |
| `/dashboard` | Owner overview: today's numbers, 14-day revenue chart, up next |
| `/dashboard/calendar` | Day view by court; click an empty slot to add a walk-in |
| `/dashboard/bookings` | All bookings with period, status and search filters |
| `/dashboard/customers` | Players, games, spend, last and next visit |
| `/dashboard/settings` | Opening hours, rate bands per sport, cancellation policy |

## How the data works (until `Server/` exists)

- `src/lib/catalog/venues.ts`: eight sample venues. The dashboard is signed in as Night Owl Arena (`DEMO_OWNER_VENUE_ID`).
- `src/lib/catalog/seed.ts`: generated sample bookings. The same date always gives the same bookings, so venues look busy without storing anything.
- `src/lib/store/store.ts`: bookings made in the app, cancellations and owner settings, saved in `localStorage`. Every write goes through its actions (`createBooking`, `cancelBooking`, `markPaid`, `saveVenueSettings`), which are the functions to replace with API calls.
- `src/lib/store/queries.ts`: read helpers that merge sample and saved bookings.
- A booking made as a player shows up in the owner dashboard, and price changes in the dashboard show on the venue page.
- "Reset demo data" on the Prices and rules page clears everything saved in the browser.

Hours are counted from midnight of the operating day and can run past 24, so a venue open 4 PM to 4 AM has `openHour: 16, closeHour: 28`. Use `formatWhen()` from `src/lib/domain/time.ts` whenever a booking time is shown to a person: it prints the real calendar date for after-midnight slots.

## Rendering

Pages that depend on today's date or saved bookings render in the browser behind a `<Suspense>` skeleton (`useBrowserOnly()` in `src/lib/hooks.ts`, which uses React's `browser()`). Everything else is prerendered: venue names, addresses and amenities are static HTML for every venue.

## Not real yet

- Payments are simulated; no card details are ever collected in this app.
- No accounts: "My bookings" means bookings made in this browser.
- The landing page waitlist form doesn't send anywhere (`TODO(server)` in `WaitlistForm.tsx`).

Brand reference: `../brand/BRAND.md`.
