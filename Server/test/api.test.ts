// End-to-end API tests against a real Postgres (TEST_DATABASE_URL).
// They migrate and seed that database, and delete its bookings, customers and sign-ins.
import "dotenv/config";
import { execSync } from "node:child_process";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { createDb, type DB } from "../src/db.ts";
import { createPaymentProvider } from "../src/services/payments/provider.ts";
import { testProvider } from "../src/services/payments/test.ts";
import type { SmsProvider } from "../src/services/sms.ts";

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
const OWNER = "03111111111"; // owns Night Owl Arena in these tests
const OTHER_OWNER = "03222222222"; // owns Baseline Padel Club

describe("payment provider setup", () => {
  it("refuses to start in production without a real provider", () => {
    expect(() => createPaymentProvider({ name: undefined, isProduction: true, allowTestPaymentsInProduction: false })).toThrow(
      /PAYMENT_PROVIDER/,
    );
    expect(() => createPaymentProvider({ name: "test", isProduction: true, allowTestPaymentsInProduction: false })).toThrow(
      /can't run in production/,
    );
    expect(() => createPaymentProvider({ name: "jazzcash", isProduction: true, allowTestPaymentsInProduction: false })).toThrow(/stub/);
    expect(createPaymentProvider({ name: "test", isProduction: false, allowTestPaymentsInProduction: false }).name).toBe("test");
  });
});

describe.skipIf(!available)("API", () => {
  let db: DB;
  let app: Awaited<ReturnType<typeof buildApp>>;
  let clock = lahore(`${DAY}T15:00:00`);
  const sent: { phone: string; message: string }[] = [];
  const sms: SmsProvider = { name: "capture", send: async (phone, message) => void sent.push({ phone, message }) };

  type Method = "GET" | "POST" | "PUT" | "PATCH";
  const call = (method: Method, path: string, payload?: object, token?: string) =>
    app.inject({
      method,
      url: path,
      ...(payload ? { payload } : {}),
      ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
    });

  const form = (path: string) =>
    app.inject({ method: "POST", url: path, payload: "", headers: { "content-type": "application/x-www-form-urlencoded" } });

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

  const lastCode = (raw: string) => {
    const phone = raw.replace(/[\s-]/g, ""); // the server sends to the normalised number
    const msg = [...sent].reverse().find((m) => m.phone === phone)?.message ?? "";
    return msg.slice(0, 6);
  };

  async function signIn(phone: string) {
    expect((await call("POST", "/auth/otp", { phone })).statusCode).toBe(204);
    const res = await call("POST", "/auth/verify", { phone, code: lastCode(phone) });
    expect(res.statusCode).toBe(200);
    return res.json() as { token: string; user: { phone: string; name: string | null; ownerOf: { venueId: string }[] } };
  }

  async function payNow(ref: string) {
    return form(`/pay/test/${ref}/pay`);
  }

  beforeAll(async () => {
    const env = { ...process.env, DATABASE_URL: url, OWNER_PHONES: "" };
    execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
    execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });
    db = createDb(url);
    app = await buildApp({
      db,
      now: () => clock,
      sms,
      payments: testProvider,
      settings: { otpSecret: "test-secret", otpDevEcho: false, publicBaseUrl: "http://api.test" },
    });
  }, 120_000);

  beforeEach(async () => {
    clock = lahore(`${DAY}T15:00:00`);
    sent.length = 0;
    await db.$executeRaw`TRUNCATE bookings, customers, sessions, users, otp_codes, venue_owners RESTART IDENTITY CASCADE`;
    execSync("npx tsx prisma/seed.ts", { env: { ...process.env, DATABASE_URL: url, OWNER_PHONES: "" }, stdio: "pipe" });
    await db.venueOwner.createMany({
      data: [
        { phone: OWNER, venueId: "v-night-owl" },
        { phone: OTHER_OWNER, venueId: "v-baseline" },
      ],
    });
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await db?.$disconnect();
  });

  // ---------- venues and bookings ----------

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

  it("holds an online booking, prices it on the server and shows the slot as taken", async () => {
    const res = await book({ price: 1 }); // a client-sent price is ignored
    expect(res.statusCode).toBe(201);
    const { booking: b, checkout } = res.json();
    expect(b).toMatchObject({ date: DAY, start: 25, hours: 2, price: 4500 + 3500, paid: false, status: "pending_payment", source: "online" });
    expect(new Date(b.holdExpiresAt).getTime()).toBe(clock.getTime() + 10 * 60_000);
    expect(checkout.url).toBe(`http://api.test/pay/test/${b.ref}`);
    expect(b.customer.phone).toBe("03001234567");
    expect(b.ref).toMatch(/^KS-[A-Z2-9]{5}$/);

    const avail = (await call("GET", `/venues/night-owl-arena-johar-town/availability?date=${DAY}&courtId=no-f1`)).json();
    const status = (h: number) => avail.courts[0].slots.find((s: { hour: number }) => s.hour === h).status;
    expect([status(24), status(25), status(26), status(27)]).toEqual(["free", "booked", "booked", "free"]);
  });

  it("confirms cash bookings straight away, unpaid", async () => {
    const res = await book({ payment: "cash", start: 20, hours: 1 });
    expect(res.statusCode).toBe(201);
    expect(res.json().checkout).toBeUndefined();
    expect(res.json().booking).toMatchObject({ status: "confirmed", paid: false, price: 4500 });
  });

  it("rejects an overlapping booking, including against a payment hold", async () => {
    expect((await book()).statusCode).toBe(201);
    const res = await book({ start: 26, hours: 1, payment: "cash", customer: { name: "Other", phone: "03211234567" } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("SLOT_TAKEN");
  });

  it("lets only one of two simultaneous requests win", async () => {
    const [a, b] = await Promise.all([book({ start: 21, hours: 1 }), book({ start: 21, hours: 1 })]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([201, 409]);
  });

  it("blocks overlaps with holds in the database itself, even around the API", async () => {
    const created = (await book()).json().booking; // pending_payment
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
    expect(ok.json().booking.status).toBe("pending_payment");
    expect((await call("GET", `/bookings/${ref}`)).statusCode).toBe(401); // no phone, no token
  });

  it("refunds a paid player by the venue's policy", async () => {
    const { ref } = (await book()).json().booking; // Sat 1 AM, Rs 8,000
    expect((await payNow(ref)).statusCode).toBe(200);
    clock = lahore(`${DAY}T21:00:00`); // 4 hours before: inside the 6-hour window, 50% back
    const res = await call("POST", `/bookings/${ref}/cancel`, { phone: player.phone });
    expect(res.json().booking).toMatchObject({ status: "cancelled", refund: 4000 });
    expect((await call("POST", `/bookings/${ref}/cancel`, { phone: player.phone })).json().error.code).toBe("ALREADY_CANCELLED");
    expect((await book({ customer: { name: "Next", phone: "03331234567" } })).statusCode).toBe(201);
  });

  // ---------- payment holds and the test provider ----------

  it("releases a hold when it expires, freeing the slot", async () => {
    const { ref } = (await book()).json().booking;
    clock = lahore(`${DAY}T15:10:01`);
    const avail = (await call("GET", `/venues/night-owl-arena-johar-town/availability?date=${DAY}&courtId=no-f1`)).json();
    expect(avail.courts[0].slots.find((s: { hour: number }) => s.hour === 25).status).toBe("free");
    const old = (await call("GET", `/bookings/${ref}?phone=${player.phone.replace(" ", "")}`)).json().booking;
    expect(old).toMatchObject({ status: "cancelled", refund: 0 });
    expect(old.holdExpiresAt).toBeUndefined();
    expect((await book({ customer: { name: "Next", phone: "03331234567" } })).statusCode).toBe(201);
  });

  it("serves the test payment page and confirms on Pay", async () => {
    const { booking, checkout } = (await book({ returnUrl: "khelspot://booking/result" })).json();
    const pageRes = await app.inject({ method: "GET", url: new URL(checkout.url).pathname });
    expect(pageRes.statusCode).toBe(200);
    expect(pageRes.headers["content-type"]).toMatch(/text\/html/);
    expect(pageRes.body).toContain("Test payment, no money moves");
    expect(pageRes.body).toContain("Rs 8,000");

    const paid = await payNow(booking.ref);
    expect(paid.statusCode).toBe(303);
    expect(paid.headers.location).toBe(`khelspot://booking/result?ref=${booking.ref}&status=paid`);
    const after = (await call("GET", `/bookings/${booking.ref}?phone=03001234567`)).json().booking;
    expect(after).toMatchObject({ status: "confirmed", paid: true });
    expect((await payNow(booking.ref)).headers.location).toContain("status=paid"); // idempotent
  });

  it("releases the slot on Cancel and redirects back", async () => {
    const { booking } = (await book({ returnUrl: "http://localhost:8081/paid?x=1" })).json();
    const res = await form(`/pay/test/${booking.ref}/cancel`);
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`http://localhost:8081/paid?x=1&ref=${booking.ref}&status=cancelled`);
    expect((await book({ customer: { name: "Next", phone: "03331234567" } })).statusCode).toBe(201);
  });

  it("ignores return URLs that aren't allow-listed", async () => {
    for (const returnUrl of [
      "https://evil.example/steal",
      "http://localhost:3000.evil.example/x",
      "http://localhost:3000@evil.example/x",
      "javascript:alert(1)",
      "khelspotx://r",
    ]) {
      const { booking } = (await book({ returnUrl, start: 21, hours: 1, customer: { name: "R", phone: "03331234567" } })).json();
      const res = await payNow(booking.ref);
      expect(res.statusCode, returnUrl).toBe(200);
      expect(res.body).toContain("You can close this page");
      await call("POST", `/bookings/${booking.ref}/cancel`, { phone: "03331234567" });
    }
  });

  it("won't take payment after the hold expired", async () => {
    const { booking } = (await book({ returnUrl: "khelspot://r" })).json(); // no path: must stay exactly "khelspot://r"
    clock = lahore(`${DAY}T15:20:00`);
    const res = await payNow(booking.ref);
    expect(res.headers.location).toBe(`khelspot://r?ref=${booking.ref}&status=cancelled`);
    expect((await app.inject({ method: "GET", url: `/pay/test/${booking.ref}` })).body).toContain("Payment closed");
  });

  // ---------- sign-in ----------

  it("signs in with a phone code and manages the session", async () => {
    const { token, user } = await signIn("0311 1111111");
    expect(user).toEqual({ phone: OWNER, name: null, ownerOf: [{ venueId: "v-night-owl", slug: "night-owl-arena-johar-town", name: "Night Owl Arena" }] });
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await db.session.count({ where: { tokenHash: token } })).toBe(0); // stored hashed

    expect((await call("GET", "/me", undefined, token)).json().user.phone).toBe(OWNER);
    expect((await call("PATCH", "/me", { name: "Usman" }, token)).json().user.name).toBe("Usman");
    expect((await call("GET", "/me")).statusCode).toBe(401);
    expect((await call("GET", "/me", undefined, "not-a-token")).json().error.code).toBe("UNAUTHENTICATED");

    expect((await call("POST", "/auth/logout", undefined, token)).statusCode).toBe(204);
    expect((await call("GET", "/me", undefined, token)).statusCode).toBe(401);
  });

  it("limits sends, attempts and code lifetime", async () => {
    const phone = "03005556677";
    for (let i = 0; i < 3; i++) expect((await call("POST", "/auth/otp", { phone })).statusCode).toBe(204);
    const fourth = await call("POST", "/auth/otp", { phone });
    expect(fourth.statusCode).toBe(429);
    expect(fourth.json().error.code).toBe("TOO_MANY");

    const code = lastCode(phone);
    const wrong = code === "000000" ? "111111" : "000000";
    const first = await call("POST", "/auth/verify", { phone, code: wrong });
    expect(first.json().error).toMatchObject({ code: "CODE_WRONG", message: expect.stringContaining("4 tries left") });
    for (let i = 0; i < 3; i++) await call("POST", "/auth/verify", { phone, code: wrong });
    expect((await call("POST", "/auth/verify", { phone, code: wrong })).json().error.code).toBe("CODE_EXPIRED"); // 5th wrong
    expect((await call("POST", "/auth/verify", { phone, code })).json().error.code).toBe("CODE_EXPIRED"); // locked

    clock = lahore(`${DAY}T15:10:01`); // send window over
    expect((await call("POST", "/auth/otp", { phone })).statusCode).toBe(204);
    const fresh = lastCode(phone);
    clock = lahore(`${DAY}T15:15:02`); // 5 minutes later: expired
    expect((await call("POST", "/auth/verify", { phone, code: fresh })).json().error.code).toBe("CODE_EXPIRED");
  });

  it("only the newest code works, and codes are stored hashed", async () => {
    const phone = "03005556678";
    await call("POST", "/auth/otp", { phone });
    const older = lastCode(phone);
    await call("POST", "/auth/otp", { phone });
    const newer = lastCode(phone);
    const rows = await db.otpCode.findMany({ where: { phone } });
    expect(rows.every((r) => !r.codeHash.includes(older) && !r.codeHash.includes(newer))).toBe(true);
    if (older !== newer) expect((await call("POST", "/auth/verify", { phone, code: older })).statusCode).toBe(400);
    expect((await call("POST", "/auth/verify", { phone, code: newer })).statusCode).toBe(200);
  });

  it("echoes the code only when development echo is on", async () => {
    const echoApp = await buildApp({ db, now: () => clock, sms, payments: testProvider, settings: { otpSecret: "s", otpDevEcho: true } });
    const res = await echoApp.inject({ method: "POST", url: "/auth/otp", payload: { phone: "03007778899" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().devCode).toMatch(/^\d{6}$/);
    await echoApp.close();
  });

  it("lists a signed-in player's bookings, newest first", async () => {
    const early = (await book({ payment: "cash", start: 20, hours: 1 })).json().booking;
    const later = (await book({ payment: "cash", date: "2026-11-21", start: 20, hours: 1 })).json().booking;
    await call("POST", `/bookings/${early.ref}/cancel`, { phone: player.phone });
    await book({ payment: "cash", start: 21, hours: 1, customer: { name: "Someone", phone: "03449998877" } });

    const { token } = await signIn(player.phone);
    const list = (await call("GET", "/me/bookings", undefined, token)).json().bookings;
    expect(list.map((b: { ref: string }) => b.ref)).toEqual([later.ref, early.ref]);
    expect(list[1].status).toBe("cancelled");
    expect(list[0].venue).toEqual({ id: "v-night-owl", slug: "night-owl-arena-johar-town", name: "Night Owl Arena", area: "Johar Town" });
    expect((await call("GET", `/bookings/${later.ref}`, undefined, token)).statusCode).toBe(200); // token instead of phone
  });

  // ---------- venue owners ----------

  it("keeps owner routes to the venue's own owners", async () => {
    const mine = (await book({ payment: "cash", start: 20, hours: 1 })).json().booking;
    const { token: other } = await signIn(OTHER_OWNER);
    const { token: playerToken } = await signIn(player.phone);
    const routes: [Method, string, object?][] = [
      ["GET", "/owner/venues/v-night-owl"],
      ["GET", `/owner/venues/v-night-owl/bookings?from=${DAY}&to=${DAY}`],
      ["GET", "/owner/venues/v-night-owl/customers"],
      ["GET", `/owner/bookings/${mine.ref}`],
      ["POST", `/owner/bookings/${mine.ref}/mark-paid`],
      ["POST", `/owner/bookings/${mine.ref}/cancel`],
      ["POST", "/owner/bookings", { venueId: "v-night-owl", courtId: "no-c1", date: DAY, start: 21, hours: 1, customer: player, payment: "cash" }],
    ];
    for (const [method, path, body] of routes) {
      expect((await call(method, path, body)).json().error.code, `${method} ${path} signed out`).toBe("UNAUTHENTICATED");
      expect((await call(method, path, body, other)).statusCode, `${method} ${path} other owner`).toBe(403);
      expect((await call(method, path, body, playerToken)).json().error.code, `${method} ${path} player`).toBe("NOT_YOUR_VENUE");
    }
    // Unknown refs look the same as anyone else's to signed-out callers.
    expect((await call("GET", "/owner/bookings/KS-NOPE1")).statusCode).toBe(401);
    expect(await db.booking.count({ where: { status: "cancelled" } })).toBe(0);
  });

  it("handles walk-ins: unpaid cash, mark paid, owner cancels with full refund", async () => {
    const { token } = await signIn(OWNER);
    const res = await call(
      "POST",
      "/owner/bookings",
      { venueId: "v-night-owl", courtId: "no-c1", date: DAY, start: 21, hours: 1, customer: { name: "Walk In", phone: "03211234567" }, payment: "cash" },
      token,
    );
    expect(res.statusCode).toBe(201);
    const walkIn = res.json().booking;
    expect(walkIn).toMatchObject({ source: "walk-in", paid: false, price: 3500, status: "confirmed" });

    expect((await call("POST", `/owner/bookings/${walkIn.ref}/mark-paid`, undefined, token)).json().booking.paid).toBe(true);
    clock = lahore(`${DAY}T20:30:00`); // late, but owners always refund in full
    expect((await call("POST", `/owner/bookings/${walkIn.ref}/cancel`, undefined, token)).json().booking.refund).toBe(3500);
  });

  it("won't let an owner mark a payment hold as paid", async () => {
    const { token } = await signIn(OWNER);
    const { booking } = (await book()).json();
    expect((await call("POST", `/owner/bookings/${booking.ref}/mark-paid`, undefined, token)).json().error.code).toBe("PENDING_PAYMENT");
  });

  it("lists bookings and customers for the owner", async () => {
    const { token } = await signIn(OWNER);
    await book({ payment: "cash" });
    await book({ payment: "cash", start: 20, hours: 1 });
    const q = (s: string) => call("GET", `/owner/venues/v-night-owl/bookings?${s}`, undefined, token);
    expect((await q(`from=${DAY}&to=${DAY}`)).json().bookings.map((b: { start: number }) => b.start)).toEqual([20, 25]);
    expect((await q(`from=${DAY}&to=${DAY}&status=cancelled`)).json().bookings).toEqual([]);
    expect((await q(`from=${DAY}&to=2026-11-19`)).statusCode).toBe(400);

    clock = lahore("2026-11-21T09:00:00"); // both played
    const customers = (await call("GET", "/owner/venues/v-night-owl/customers", undefined, token)).json().customers;
    expect(customers).toEqual([expect.objectContaining({ phone: "03001234567", games: 2, hours: 3, spent: 4500 + 8000, lastVisit: DAY })]);
  });

  it("updates prices without changing existing bookings", async () => {
    const { token } = await signIn(OWNER);
    const before = (await book({ payment: "cash" })).json().booking;
    const venue = (await call("GET", "/venues/night-owl-arena-johar-town")).json().venue;
    const pricing = {
      ...venue.pricing,
      futsal: venue.pricing.futsal.map((b: { label: string }) => (b.label === "Peak" ? { ...b, price: 5000 } : b)),
    };
    const settings = { openHour: venue.openHour, closeHour: venue.closeHour, pricing, cancellation: venue.cancellation, payAtVenue: venue.payAtVenue };
    const put = (body: object) => call("PUT", "/owner/venues/v-night-owl/settings", body, token);

    const bad = await put({ ...settings, pricing: { ...pricing, futsal: pricing.futsal.slice(0, 2) } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.message).toMatch(/no rate at 2 AM/);

    expect((await put(settings)).statusCode).toBe(200);
    const avail = (await call("GET", `/venues/night-owl-arena-johar-town/availability?date=${DAY}&courtId=no-f2`)).json();
    expect(avail.courts[0].slots.find((s: { hour: number }) => s.hour === 21).price).toBe(5000);
    const again = (await call("GET", `/bookings/${before.ref}?phone=03001234567`)).json().booking;
    expect(again.price).toBe(8000);
  });
});
