"use client";

// Client-side data store for the demo. Bookings made on this device and the
// owner's venue settings are kept in localStorage. Everything goes through the
// actions below, so they can be swapped for Server API calls later.

import { useSyncExternalStore } from "react";
import { getVenueById } from "@/lib/catalog/venues";
import { priceFor, refundQuote } from "@/lib/domain/pricing";
import type { Booking, Customer, Hour, ISODate, PaymentMethod, VenueProfile, VenueSettings } from "@/lib/domain/types";
import { bookingsFor, isRangeFree, venueWithSettings } from "./queries";

export interface StoreState {
  version: 1;
  bookings: Booking[];
  /** Sample bookings cancelled from the dashboard, by booking id. */
  seedChanges: Record<string, Partial<Booking>>;
  settings: Record<string, VenueSettings>;
  /** The owner's own description of their venue, by venue id. */
  profiles: Record<string, VenueProfile>;
  profile: Customer | null;
}

const KEY = "khelspot:demo:v1";
const EMPTY: StoreState = { version: 1, bookings: [], seedChanges: {}, settings: {}, profiles: {}, profile: null };

let state: StoreState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): StoreState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as StoreState;
    return parsed.version === 1 ? { ...EMPTY, ...parsed } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = load();
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

/** Returns false when the browser would not store it, so callers can say so. */
function setState(next: StoreState): boolean {
  state = next;
  let stored = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: keep working in memory.
    stored = false;
  }
  listeners.forEach((l) => l());
  return stored;
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureLoaded();
  return state;
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function readStore(): StoreState {
  return getSnapshot();
}

// ---------- actions ----------

export class BookingError extends Error {}

function makeRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `KS-${s}`;
}

export interface NewBooking {
  venueId: string;
  courtId: string;
  date: ISODate;
  start: Hour;
  hours: number;
  customer: Customer;
  payment: PaymentMethod;
  source: "online" | "walk-in";
  mine?: boolean;
}

export function createBooking(input: NewBooking): Booking {
  const current = getSnapshot();
  const base = getVenueById(input.venueId);
  if (!base) throw new BookingError("That venue no longer exists.");
  const venue = venueWithSettings(current, base);
  const court = venue.courts.find((c) => c.id === input.courtId);
  if (!court) throw new BookingError("That court no longer exists.");
  if (input.start < venue.openHour || input.start + input.hours > venue.closeHour) {
    throw new BookingError("The venue is closed for part of that time.");
  }
  const existing = bookingsFor(current, base, input.date);
  if (!isRangeFree(existing, input.courtId, input.start, input.hours)) {
    throw new BookingError(
      input.source === "walk-in"
        ? `${court.name} is already booked for part of that time.`
        : "Someone booked this slot a moment ago. Please pick another time.",
    );
  }
  const price = priceFor(venue.pricing[court.sport], input.start, input.hours);
  if (price === null) throw new BookingError("There's no rate set for part of that time.");

  const booking: Booking = {
    id: crypto.randomUUID(),
    ref: makeRef(),
    venueId: input.venueId,
    courtId: input.courtId,
    date: input.date,
    start: input.start,
    hours: input.hours,
    price,
    customer: input.customer,
    payment: input.payment,
    paid: input.payment !== "cash",
    status: "confirmed",
    source: input.source,
    createdAt: new Date().toISOString(),
    mine: input.mine,
  };
  setState({
    ...current,
    bookings: [...current.bookings, booking],
    profile: input.mine ? input.customer : current.profile,
  });
  return booking;
}

export function cancelBooking(booking: Booking, by: "player" | "owner"): Booking {
  const current = getSnapshot();
  const base = getVenueById(booking.venueId);
  if (!base) throw new BookingError("That venue no longer exists.");
  const venue = venueWithSettings(current, base);
  const quote = refundQuote(booking, venue.cancellation);
  if (!quote.canCancel) throw new BookingError(quote.reason);
  // Owners cancelling refund in full; players get the policy amount.
  const refund = by === "owner" ? (booking.paid ? booking.price : 0) : quote.amount;
  const patch: Partial<Booking> = { status: "cancelled", cancelledAt: new Date().toISOString(), refund };
  return updateBooking(booking, patch);
}

export function markPaid(booking: Booking): Booking {
  return updateBooking(booking, { paid: true });
}

function updateBooking(booking: Booking, patch: Partial<Booking>): Booking {
  const current = getSnapshot();
  if (booking.seeded) {
    setState({
      ...current,
      seedChanges: { ...current.seedChanges, [booking.id]: { ...current.seedChanges[booking.id], ...patch } },
    });
  } else {
    setState({
      ...current,
      bookings: current.bookings.map((b) => (b.id === booking.id ? { ...b, ...patch } : b)),
    });
  }
  return { ...booking, ...patch };
}

export function saveVenueSettings(venueId: string, settings: VenueSettings) {
  const current = getSnapshot();
  setState({ ...current, settings: { ...current.settings, [venueId]: settings } });
}

/** False when the browser ran out of room, usually because the photo is too large. */
export function saveVenueProfile(venueId: string, profile: VenueProfile): boolean {
  const current = getSnapshot();
  return setState({ ...current, profiles: { ...current.profiles, [venueId]: profile } });
}

export function resetDemo() {
  setState(EMPTY);
}
