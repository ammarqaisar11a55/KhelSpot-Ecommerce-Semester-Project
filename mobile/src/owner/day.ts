// An owner's day: the venue's courts by hour, each cell open, booked (with the
// booking), past or closed. Built from GET /owner/venues/:id and its bookings.

import { rateAt } from "@shared/domain/pricing";
import { isPast } from "@shared/domain/time";
import type { Booking, Court, ISODate, Venue } from "@shared/domain/types";

export type CellStatus = "open" | "booked" | "held" | "past" | "closed";

export interface Cell {
  hour: number;
  status: CellStatus;
  booking?: Booking;
}

/** Bookings that still take up the court. */
export const isLive = (b: Booking) => b.status === "confirmed" || b.status === "pending_payment";

export function courtDay(venue: Venue, court: Court, bookings: Booking[], date: ISODate, now = new Date()): Cell[] {
  const cells: Cell[] = [];
  for (let h = venue.openHour; h < venue.closeHour; h++) {
    const booking = bookings.find(
      (b) => isLive(b) && b.courtId === court.id && b.date === date && b.start <= h && h < b.start + b.hours,
    );
    let status: CellStatus;
    if (booking) status = booking.status === "pending_payment" ? "held" : "booked";
    else if (!rateAt(venue.pricing[court.sport], h)) status = "closed";
    else if (isPast(date, h, now)) status = "past";
    else status = "open";
    cells.push({ hour: h, status, booking });
  }
  return cells;
}
