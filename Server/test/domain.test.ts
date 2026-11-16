import { describe, expect, it } from "vitest";
import { priceFor, refundQuote } from "../src/domain/pricing.ts";
import { formatWhen, isPast, operatingNow, realDate, slotStart } from "../src/domain/time.ts";
import type { Booking, RateBand, Venue } from "../src/domain/types.ts";
import { slotsFor } from "../src/services/bookings.ts";
import { settingsProblems } from "../src/services/venues.ts";
import { VENUES } from "../prisma/seed-data.ts";

// Tests run with TZ=Asia/Karachi (vitest.config.ts), like the server.
const lahore = (s: string) => new Date(`${s}+05:00`);

const FUTSAL: RateBand[] = [
  { from: 16, to: 19, price: 3000, label: "Off-peak" },
  { from: 19, to: 26, price: 4500, label: "Peak" },
  { from: 26, to: 28, price: 3500, label: "Late" },
];

describe("pricing", () => {
  it("adds up each hour at its own rate", () => {
    expect(priceFor(FUTSAL, 18, 2)).toBe(3000 + 4500);
    expect(priceFor(FUTSAL, 25, 2)).toBe(4500 + 3500);
  });

  it("refuses a range with an hour that has no rate", () => {
    expect(priceFor(FUTSAL, 27, 2)).toBeNull();
    expect(priceFor(FUTSAL, 15, 1)).toBeNull();
  });
});

describe("refunds", () => {
  const policy = { freeUntilHours: 6, lateRefundPercent: 50 };
  const booking = { date: "2026-11-20", start: 21, price: 9000, paid: true };

  it("refunds in full when cancelled early enough", () => {
    const q = refundQuote(booking, policy, lahore("2026-11-20T10:00:00"));
    expect(q).toMatchObject({ canCancel: true, percent: 100, amount: 9000 });
  });

  it("refunds the late percentage inside the window", () => {
    const q = refundQuote(booking, policy, lahore("2026-11-20T18:00:00"));
    expect(q).toMatchObject({ canCancel: true, percent: 50, amount: 4500 });
  });

  it("refunds nothing that wasn't paid", () => {
    const q = refundQuote({ ...booking, paid: false }, policy, lahore("2026-11-20T10:00:00"));
    expect(q.amount).toBe(0);
  });

  it("won't cancel once the booking has started", () => {
    const q = refundQuote(booking, policy, lahore("2026-11-20T21:30:00"));
    expect(q.canCancel).toBe(false);
  });
});

describe("after-midnight hours", () => {
  it("puts hour 25 of Friday at 1 AM on Saturday", () => {
    expect(realDate("2026-11-20", 25)).toBe("2026-11-21");
    expect(slotStart("2026-11-20", 25).getTime()).toBe(lahore("2026-11-21T01:00:00").getTime());
    expect(formatWhen("2026-11-20", 25, 2)).toBe("Sat 21 Nov, 1:00 AM – 3:00 AM");
  });

  it("treats 1:30 AM as the previous operating day", () => {
    expect(operatingNow(lahore("2026-11-21T01:30:00"))).toEqual({ date: "2026-11-20", hour: 25.5 });
    expect(operatingNow(lahore("2026-11-21T07:00:00")).date).toBe("2026-11-21");
  });

  it("knows a 1 AM slot is still ahead at 11 PM", () => {
    expect(isPast("2026-11-20", 25, lahore("2026-11-20T23:00:00"))).toBe(false);
    expect(isPast("2026-11-20", 25, lahore("2026-11-21T01:10:00"))).toBe(true);
  });
});

describe("slot grid", () => {
  const venue = VENUES.find((v) => v.id === "v-night-owl") as Venue;
  const court = venue.courts[0];
  const booking = (start: number, hours: number, status: Booking["status"] = "confirmed") =>
    ({ courtId: court.id, start, hours, status }) as Booking;

  it("marks booked, passed and free hours", () => {
    const slots = slotsFor(venue, court, [booking(20, 2)], "2026-11-20", lahore("2026-11-20T17:30:00"));
    const at = (h: number) => slots.find((s) => s.hour === h)?.status;
    expect(at(16)).toBe("past");
    expect(at(18)).toBe("free");
    expect(at(20)).toBe("booked");
    expect(at(21)).toBe("booked");
    expect(at(22)).toBe("free");
    expect(slots).toHaveLength(venue.closeHour - venue.openHour);
  });

  it("ignores cancelled bookings and other courts", () => {
    const other = { ...booking(20, 1), courtId: "elsewhere" } as Booking;
    const slots = slotsFor(venue, court, [booking(20, 1, "cancelled"), other], "2026-11-20", lahore("2026-11-20T12:00:00"));
    expect(slots.find((s) => s.hour === 20)?.status).toBe("free");
  });
});

describe("venue settings checks", () => {
  const base = { openHour: 16, closeHour: 28, cancellation: { freeUntilHours: 6, lateRefundPercent: 50 }, payAtVenue: true };

  it("accepts the launch venues as seeded", () => {
    for (const v of VENUES) {
      const sports = [...new Set(v.courts.map((c) => c.sport))];
      expect(settingsProblems(v, sports), v.name).toEqual([]);
    }
  });

  it("catches overlapping and missing rates", () => {
    const overlapping = { ...base, pricing: { futsal: [FUTSAL[0], { ...FUTSAL[1], from: 18 }, FUTSAL[2]] } };
    expect(settingsProblems(overlapping, ["futsal"]).join(" ")).toMatch(/overlap/);
    const gap = { ...base, pricing: { futsal: [FUTSAL[0], FUTSAL[1]] } };
    expect(settingsProblems(gap, ["futsal"]).join(" ")).toMatch(/no rate at 2 AM, 3 AM/);
  });
});
