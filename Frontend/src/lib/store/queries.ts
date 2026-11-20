// Pure read helpers over the store state plus the generated sample bookings.

import { seedBookings } from "@/lib/catalog/seed";
import { getVenueById } from "@/lib/catalog/venues";
import { priceFor, rateAt } from "@/lib/domain/pricing";
import { dateRange, isPast } from "@/lib/domain/time";
import type { Booking, Court, Hour, ISODate, RateBand, Venue } from "@/lib/domain/types";
import type { StoreState } from "./store";

/** A venue as players see it: the listing with the owner's saved settings and profile. */
export function venueWithSettings(state: StoreState, venue: Venue): Venue {
  const s = state.settings[venue.id];
  const p = state.profiles?.[venue.id];
  const withSettings = s ? { ...venue, ...s } : venue;
  if (!p) return withSettings;
  const photo =
    p.photo === undefined
      ? withSettings.photo
      : p.photo === null
        ? undefined
        : { src: p.photo.src, alt: p.photo.alt, credit: "", creditUrl: "" };
  return {
    ...withSettings,
    name: p.name,
    area: p.area,
    address: p.address,
    description: p.description,
    amenities: p.amenities,
    courts: withSettings.courts.map((court) => ({ ...court, name: p.courtNames[court.id]?.trim() || court.name })),
    photo,
    mapUrl: p.mapUrl === undefined ? withSettings.mapUrl : p.mapUrl || undefined,
  };
}

/** Every booking at a venue on one operating day, cancelled ones included. */
export function bookingsFor(state: StoreState, venue: Venue, date: ISODate): Booking[] {
  const seeded = seedBookings(venue, date).map((b) => {
    const change = state.seedChanges[b.id];
    return change ? { ...b, ...change } : b;
  });
  const own = state.bookings.filter((b) => b.venueId === venue.id && b.date === date);
  return [...seeded, ...own].sort((a, b) => a.start - b.start);
}

export function bookingsInRange(state: StoreState, venue: Venue, from: ISODate, to: ISODate): Booking[] {
  return dateRange(from, to).flatMap((d) => bookingsFor(state, venue, d));
}

export const isActive = (b: Booking) => b.status === "confirmed";

export function isRangeFree(bookings: Booking[], courtId: string, start: Hour, hours: number): boolean {
  return !bookings.some(
    (b) => isActive(b) && b.courtId === courtId && b.start < start + hours && start < b.start + b.hours,
  );
}

export type SlotStatus = "free" | "booked" | "past" | "no-rate";

export interface SlotInfo {
  hour: Hour;
  status: SlotStatus;
  band?: RateBand;
}

export function slotsFor(venue: Venue, court: Court, bookings: Booking[], date: ISODate, now: Date): SlotInfo[] {
  const bands = venue.pricing[court.sport];
  const out: SlotInfo[] = [];
  for (let h = venue.openHour; h < venue.closeHour; h++) {
    const band = rateAt(bands, h);
    let status: SlotStatus = "free";
    if (!band) status = "no-rate";
    else if (isPast(date, h, now)) status = "past";
    else if (!isRangeFree(bookings, court.id, h, 1)) status = "booked";
    out.push({ hour: h, status, band });
  }
  return out;
}

/** Longest booking (up to `max` hours) that fits from `start` without hitting a booked or closed hour. */
export function maxHoursFrom(slots: SlotInfo[], start: Hour, max = 3): number {
  let n = 0;
  for (const s of slots) {
    if (s.hour < start) continue;
    if (s.hour !== start + n || s.status !== "free") break;
    n++;
    if (n === max) break;
  }
  return n;
}

export function freeSlotCount(state: StoreState, venue: Venue, date: ISODate, now: Date): number {
  const bookings = bookingsFor(state, venue, date);
  return venue.courts.reduce(
    (sum, c) => sum + slotsFor(venue, c, bookings, date, now).filter((s) => s.status === "free").length,
    0,
  );
}

export function findMyBooking(state: StoreState, ref: string): Booking | undefined {
  return state.bookings.find((b) => b.ref === ref);
}

export function myBookings(state: StoreState): Booking[] {
  return state.bookings.filter((b) => b.mine);
}

export function courtOf(venue: Venue, courtId: string): Court | undefined {
  return venue.courts.find((c) => c.id === courtId);
}

export function venueOf(state: StoreState, booking: Booking): Venue | undefined {
  const v = getVenueById(booking.venueId);
  return v ? venueWithSettings(state, v) : undefined;
}

export function quotePrice(venue: Venue, court: Court, start: Hour, hours: number): number | null {
  return priceFor(venue.pricing[court.sport], start, hours);
}

/** Has the booking finished (end time passed)? */
export function isFinished(b: Booking, now: Date): boolean {
  return isPast(b.date, b.start + b.hours, now);
}
