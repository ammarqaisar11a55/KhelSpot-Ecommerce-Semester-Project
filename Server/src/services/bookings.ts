import { randomInt } from "node:crypto";
import type { z } from "zod";
import type { DB } from "../db.ts";
import { priceFor, rateAt, refundQuote } from "../domain/pricing.ts";
import { addDays, dateRange, isPast, operatingNow } from "../domain/time.ts";
import type { Booking, Court, Hour, ISODate, RateBand, Venue } from "../domain/types.ts";
import { ApiError, badRequest, conflict, isOverlapViolation, notFound } from "../http/errors.ts";
import type { newBooking, walkInBooking } from "../http/schemas.ts";
import { bookingInclude, isoToDate, toBooking } from "./mappers.ts";
import { getVenueById } from "./venues.ts";

// ---------- availability ----------

export type SlotStatus = "free" | "booked" | "past" | "no-rate";

export interface Slot {
  hour: Hour;
  status: SlotStatus;
  price?: number;
  band?: string;
}

export interface CourtAvailability {
  courtId: string;
  name: string;
  sport: Court["sport"];
  slots: Slot[];
}

function overlaps(b: Pick<Booking, "start" | "hours">, start: Hour, hours: number) {
  return b.start < start + hours && start < b.start + b.hours;
}

export function slotsFor(venue: Venue, court: Court, bookings: Booking[], date: ISODate, now: Date): Slot[] {
  const bands = venue.pricing[court.sport];
  const taken = bookings.filter((b) => b.courtId === court.id && b.status === "confirmed");
  const out: Slot[] = [];
  for (let h = venue.openHour; h < venue.closeHour; h++) {
    const band: RateBand | undefined = rateAt(bands, h);
    let status: SlotStatus = "free";
    if (!band) status = "no-rate";
    else if (isPast(date, h, now)) status = "past";
    else if (taken.some((b) => overlaps(b, h, 1))) status = "booked";
    out.push({ hour: h, status, ...(band ? { price: band.price, band: band.label } : {}) });
  }
  return out;
}

export async function bookingsOn(db: DB, venueId: string, from: ISODate, to: ISODate = from) {
  const rows = await db.booking.findMany({
    where: { venueId, date: { gte: isoToDate(from), lte: isoToDate(to) } },
    include: bookingInclude,
    orderBy: [{ date: "asc" }, { startHour: "asc" }],
  });
  return rows.map(toBooking);
}

export async function availability(db: DB, venue: Venue, date: ISODate, now: Date, courtId?: string) {
  const courts = venue.courts.filter((c) => !courtId || c.id === courtId);
  if (courtId && !courts.length) throw notFound("Court");
  const bookings = await bookingsOn(db, venue.id, date);
  return {
    venueId: venue.id,
    date,
    courts: courts.map<CourtAvailability>((c) => ({
      courtId: c.id,
      name: c.name,
      sport: c.sport,
      slots: slotsFor(venue, c, bookings, date, now),
    })),
  };
}

// ---------- creating ----------

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeRef = () => `KS-${Array.from({ length: 5 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("")}`;

type NewBooking = z.infer<typeof newBooking> & { source: "online" | "walk-in"; paid?: boolean };

export async function createBooking(db: DB, input: NewBooking, now: Date): Promise<Booking> {
  const venue = await getVenueById(db, input.venueId);
  const court = venue.courts.find((c) => c.id === input.courtId);
  if (!court) throw notFound("Court");

  if (input.start < venue.openHour || input.start + input.hours > venue.closeHour) {
    throw badRequest("CLOSED", "The venue is closed for part of that time.");
  }
  if (isPast(input.date, input.start, now)) {
    throw badRequest("IN_PAST", "That time has already started.");
  }
  if (input.date > addDays(operatingNow(now).date, 60)) {
    throw badRequest("TOO_FAR", "Bookings open up to 60 days ahead.");
  }
  if (input.payment === "cash" && input.source === "online" && !venue.payAtVenue) {
    throw badRequest("PAY_ONLINE", "This venue only takes online payment.");
  }
  const price = priceFor(venue.pricing[court.sport], input.start, input.hours);
  if (price === null) throw badRequest("NO_RATE", "There's no rate set for part of that time.");

  const slotTaken = () =>
    conflict(
      "SLOT_TAKEN",
      input.source === "walk-in"
        ? `${court.name} is already booked for part of that time.`
        : "Someone booked this slot a moment ago. Please pick another time.",
    );

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const row = await db.$transaction(async (tx) => {
        // Friendly check first; the booking_no_overlap constraint is the real guard against races.
        const sameDay = await tx.booking.findMany({
          where: { courtId: court.id, date: isoToDate(input.date), status: "confirmed" },
          select: { startHour: true, hours: true },
        });
        if (sameDay.some((b) => overlaps({ start: b.startHour, hours: b.hours }, input.start, input.hours))) {
          throw slotTaken();
        }
        const customer = await tx.customer.upsert({
          where: { phone: input.customer.phone },
          update: { name: input.customer.name },
          create: { name: input.customer.name, phone: input.customer.phone },
        });
        return tx.booking.create({
          data: {
            ref: makeRef(),
            venueId: venue.id,
            courtId: court.id,
            customerId: customer.id,
            date: isoToDate(input.date),
            startHour: input.start,
            hours: input.hours,
            price,
            payment: input.payment,
            paid: input.payment !== "cash" || input.paid === true,
            source: input.source === "walk-in" ? "walk_in" : "online",
          },
          include: bookingInclude,
        });
      });
      return toBooking(row);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (isOverlapViolation(err)) throw slotTaken();
      // Unique ref collision: try again with a new ref.
      if (String((err as { code?: string }).code) === "P2002" && attempt < 2) continue;
      throw err;
    }
  }
  throw new Error("Could not create booking.");
}

export function createWalkIn(db: DB, input: z.infer<typeof walkInBooking>, now: Date) {
  return createBooking(db, { ...input, source: "walk-in" }, now);
}

// ---------- reading and changing ----------

async function findByRef(db: DB, ref: string) {
  const row = await db.booking.findUnique({ where: { ref: ref.toUpperCase() }, include: bookingInclude });
  if (!row) throw notFound("Booking");
  return row;
}

/** Without accounts yet, a player proves a booking is theirs with the phone number used to book it. */
export async function getPlayerBooking(db: DB, ref: string, phone: string): Promise<Booking> {
  const row = await findByRef(db, ref);
  if (row.customer.phone !== phone) throw notFound("Booking");
  return toBooking(row);
}

export async function getBooking(db: DB, ref: string): Promise<Booking> {
  return toBooking(await findByRef(db, ref));
}

export async function cancelBooking(
  db: DB,
  ref: string,
  by: { kind: "player"; phone: string } | { kind: "owner" },
  now: Date,
): Promise<Booking> {
  const row = await findByRef(db, ref);
  if (by.kind === "player" && row.customer.phone !== by.phone) throw notFound("Booking");
  if (row.status === "cancelled") throw conflict("ALREADY_CANCELLED", "This booking is already cancelled.");

  const booking = toBooking(row);
  const venue = await getVenueById(db, row.venueId);
  const quote = refundQuote(booking, venue.cancellation, now);
  if (!quote.canCancel) throw conflict("STARTED", quote.reason);
  // Venues cancelling refund in full; players get what the policy allows.
  const refund = by.kind === "owner" ? (booking.paid ? booking.price : 0) : quote.amount;

  const updated = await db.booking.update({
    where: { id: row.id },
    data: { status: "cancelled", cancelledAt: now, refund },
    include: bookingInclude,
  });
  return toBooking(updated);
}

export async function markPaid(db: DB, ref: string): Promise<Booking> {
  const row = await findByRef(db, ref);
  if (row.status === "cancelled") throw conflict("CANCELLED", "This booking was cancelled.");
  const updated = await db.booking.update({ where: { id: row.id }, data: { paid: true }, include: bookingInclude });
  return toBooking(updated);
}

// ---------- owner views ----------

export async function venueBookings(db: DB, venueId: string, from: ISODate, to: ISODate, status?: Booking["status"]) {
  if (to < from) throw badRequest("BAD_RANGE", "`to` must be on or after `from`.");
  if (dateRange(from, to).length > 92) throw badRequest("BAD_RANGE", "Ask for 92 days or fewer at a time.");
  await getVenueById(db, venueId);
  const list = await bookingsOn(db, venueId, from, to);
  return status ? list.filter((b) => b.status === status) : list;
}

export interface CustomerSummary {
  name: string;
  phone: string;
  games: number;
  hours: number;
  spent: number;
  lastVisit: ISODate | null;
  nextVisit: ISODate | null;
}

/** Players at a venue over the last 90 days, plus anyone booked in the next 14. */
export async function venueCustomers(db: DB, venueId: string, now: Date): Promise<CustomerSummary[]> {
  await getVenueById(db, venueId);
  const today = operatingNow(now).date;
  const list = (await bookingsOn(db, venueId, addDays(today, -89), addDays(today, 14))).filter((b) => b.status === "confirmed");
  const map = new Map<string, CustomerSummary>();
  for (const b of list) {
    const c = map.get(b.customer.phone) ?? { ...b.customer, games: 0, hours: 0, spent: 0, lastVisit: null, nextVisit: null };
    if (isPast(b.date, b.start + b.hours, now)) {
      c.games += 1;
      c.hours += b.hours;
      c.spent += b.price;
      if (!c.lastVisit || b.date > c.lastVisit) c.lastVisit = b.date;
    } else if (!c.nextVisit || b.date < c.nextVisit) {
      c.nextVisit = b.date;
    }
    map.set(b.customer.phone, c);
  }
  return [...map.values()].sort((a, b) => b.games - a.games || b.spent - a.spent);
}
