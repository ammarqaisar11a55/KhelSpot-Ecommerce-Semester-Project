// End-to-end API tests against a real Postgres (TEST_DATABASE_URL).
// They migrate and seed that database, and delete its bookings and customers.
import "dotenv/config";
import { execSync } from "node:child_process";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { createDb, type DB } from "../src/db.ts";

const url = process.env.TEST_DATABASE_URL;

async function reachable(u: string | undefined) {
  if (!u) return false;
  const client = new pg.Client({ connectionString: u, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

const available = await reachable(url);
if (!available) {
  console.warn("Skipping API tests: TEST_DATABASE_URL is not set or the database is not reachable.");
}

const lahore = (s: string) => new Date(`${s}+05:00`);
const DAY = "2026-11-20"; // a Friday
const player = { name: "Test Player", phone: "0300 1234567" };

describe.skipIf(!available)("API", () => {
  let db: DB;
  let app: Awaited<ReturnType<typeof buildApp>>;
  let clock = lahore(`${DAY}T15:00:00`);

  const call = (method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    app.inject({ method, url, ...(payload ? { payload } : {}) });

  const book = (over: Partial<Record<string, unknown>> = {}) =>
    call("POST", "/bookings", {
      venueId: "v-night-owl",
      courtId: "no-f1",
      date: DAY,
      start: 25,
      hours: 2,
      customer: player,
      payment: "jazzcash",
      ...over,
    });

  beforeAll(async () => {
    const env = { ...process.env, DATABASE_URL: url };
    execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
    execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });
    db = createDb(url);
    app = await buildApp({ db, now: () => clock });
  }, 120_000);

  beforeEach(async () => {
    clock = lahore(`${DAY}T15:00:00`);
    await db.$executeRaw`TRUNCATE bookings, customers RESTART IDENTITY CASCADE`;
    execSync("npx tsx prisma/seed.ts", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await db?.$disconnect();
  });

  it("lists the four Lahore venues and filters them", async () => {
    const all = (await call("GET", "/venues")).json().venues;
    expect(all).toHaveLength(4);
    expect(new Set(all.map((v: { city: string }) => v.city))).toEqual(new Set(["Lahore"]));
    expect((await call("GET", "/venues?sport=padel")).json().venues.map((v: { id: string }) => v.id)).toEqual(["v-baseline"]);
    const nightOwl = (await call("GET", "/venues?area=johar%20town")).json().venues[0];
    expect(nightOwl.id).toBe("v-night-owl");
    expect(nightOwl.photo).toMatchObject({ src: "/venues/night-owl-arena-johar-town.jpg", credit: expect.stringContaining("Unsplash") });
    expect((await call("GET", "/venues/nope")).statusCode).toBe(404);
  });

  it("books a slot, prices it on the server and shows it as taken", async () => {
    const res = await book({ price: 1 }); // a client-sent price is ignored
    expect(res.statusCode).toBe(201);
    const b = res.json().booking;
    expect(b).toMatchObject({ date: DAY, start: 25, hours: 2, price: 4500 + 3500, paid: true, status: "confirmed", source: "online" });
    expect(b.customer.phone).toBe("03001234567");
    expect(b.ref).toMatch(/^KS-[A-Z2-9]{5}$/);

    const avail = (await call("GET", `/venues/night-owl-arena-johar-town/availability?date=${DAY}&courtId=no-f1`)).json();
    const status = (h: number) => avail.courts[0].slots.find((s: { hour: number }) => s.hour === h).status;
    expect([status(24), status(25), status(26), status(27)]).toEqual(["free", "booked", "booked", "free"]);
  });

  it("rejects an overlapping booking", async () => {
    expect((await book()).statusCode).toBe(201);
    const res = await book({ start: 26, hours: 1, customer: { name: "Other", phone: "03211234567" } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("SLOT_TAKEN");
  });

  it("lets only one of two simultaneous requests win", async () => {
    const [a, b] = await Promise.all([book({ start: 21, hours: 1 }), book({ start: 21, hours: 1 })]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([201, 409]);
  });

  it("blocks overlaps in the database itself, even around the API", async () => {
    const created = (await book()).json().booking;
    const customer = await db.customer.findFirstOrThrow();
    await expect(
      db.booking.create({
        data: {
          ref: "KS-TEST1",
          venueId: "v-night-owl",
          courtId: "no-f1",
          customerId: customer.id,
          date: new Date(`${created.date}T00:00:00Z`),
          startHour: 26,
          hours: 1,
          price: 3500,
          payment: "cash",
          paid: false,
          source: "walk_in",
        },
      }),
    ).rejects.toThrow();
  });

  it("validates input and booking times", async () => {
    const bad = await book({ customer: { name: "X", phone: "12345" } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe("VALIDATION");
    expect((await book({ start: 15, hours: 1 })).json().error.code).toBe("CLOSED");
    expect((await book({ start: 27, hours: 2 })).json().error.code).toBe("CLOSED");
    clock = lahore(`${DAY}T17:30:00`);
    expect((await book({ start: 16, hours: 1 })).json().error.code).toBe("IN_PAST");
    expect((await book({ venueId: "v-baseline", courtId: "bp-1", start: 20, hours: 1, payment: "cash" })).json().error.code).toBe(
      "PAY_ONLINE",
    );
  });

  it("only shows a booking to the phone that made it", async () => {
    const { ref } = (await book()).json().booking;
    expect((await call("GET", `/bookings/${ref}?phone=03219999999`)).statusCode).toBe(404);
    const ok = await call("GET", `/bookings/${ref}?phone=0300-1234567`);
    expect(ok.statusCode).toBe(200);
    expect(ok.json().booking.ref).toBe(ref);
  });

  it("refunds a player by the venue's policy", async () => {
    const { ref } = (await book()).json().booking; // Sat 1 AM, Rs 8,000
    clock = lahore(`${DAY}T21:00:00`); // 4 hours before: inside the 6-hour window, 50% back
    const res = await call("POST", `/bookings/${ref}/cancel`, { phone: player.phone });
    expect(res.json().booking).toMatchObject({ status: "cancelled", refund: 4000 });
    expect((await call("POST", `/bookings/${ref}/cancel`, { phone: player.phone })).json().error.code).toBe("ALREADY_CANCELLED");
    expect((await book({ customer: { name: "Next", phone: "03331234567" } })).statusCode).toBe(201);
  });

  it("handles walk-ins: unpaid cash, mark paid, owner cancels with full refund", async () => {
    const res = await call("POST", "/owner/bookings", {
      venueId: "v-night-owl",
      courtId: "no-c1",
      date: DAY,
      start: 21,
      hours: 1,
      customer: { name: "Walk In", phone: "03211234567" },
      payment: "cash",
    });
    expect(res.statusCode).toBe(201);
    const walkIn = res.json().booking;
    expect(walkIn).toMatchObject({ source: "walk-in", paid: false, price: 3500 });

    expect((await call("POST", `/owner/bookings/${walkIn.ref}/mark-paid`)).json().booking.paid).toBe(true);
    clock = lahore(`${DAY}T20:30:00`); // late, but owners always refund in full
    expect((await call("POST", `/owner/bookings/${walkIn.ref}/cancel`)).json().booking.refund).toBe(3500);
  });

  it("lists bookings and customers for the owner", async () => {
    await book();
    await book({ start: 20, hours: 1, customer: { name: "Test Player", phone: "03001234567" } });
    const list = (await call("GET", `/owner/venues/v-night-owl/bookings?from=${DAY}&to=${DAY}`)).json().bookings;
    expect(list.map((b: { start: number }) => b.start)).toEqual([20, 25]);
    expect((await call("GET", `/owner/venues/v-night-owl/bookings?from=${DAY}&to=${DAY}&status=cancelled`)).json().bookings).toEqual([]);
    expect((await call("GET", `/owner/venues/v-night-owl/bookings?from=${DAY}&to=2026-11-19`)).statusCode).toBe(400);

    clock = lahore("2026-11-21T09:00:00"); // both played
    const customers = (await call("GET", "/owner/venues/v-night-owl/customers")).json().customers;
    expect(customers).toEqual([
      expect.objectContaining({ phone: "03001234567", games: 2, hours: 3, spent: 4500 + 8000, lastVisit: DAY }),
    ]);
  });

  it("updates prices without changing existing bookings", async () => {
    const before = (await book()).json().booking;
    const venue = (await call("GET", "/venues/night-owl-arena-johar-town")).json().venue;
    const pricing = { ...venue.pricing, futsal: venue.pricing.futsal.map((b: { label: string }) => (b.label === "Peak" ? { ...b, price: 5000 } : b)) };
    const settings = { openHour: venue.openHour, closeHour: venue.closeHour, pricing, cancellation: venue.cancellation, payAtVenue: venue.payAtVenue };

    const broken = { ...settings, pricing: { ...pricing, futsal: pricing.futsal.slice(0, 2) } };
    const bad = await call("PUT", "/owner/venues/v-night-owl/settings", broken);
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.message).toMatch(/no rate at 2 AM/);

    expect((await call("PUT", "/owner/venues/v-night-owl/settings", settings)).statusCode).toBe(200);
    const avail = (await call("GET", `/venues/night-owl-arena-johar-town/availability?date=${DAY}&courtId=no-f2`)).json();
    expect(avail.courts[0].slots.find((s: { hour: number }) => s.hour === 21).price).toBe(5000);
    const again = (await call("GET", `/bookings/${before.ref}?phone=${player.phone.replace(" ", "")}`)).json().booking;
    expect(again.price).toBe(8000);
  });
});
