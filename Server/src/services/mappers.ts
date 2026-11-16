// Database rows -> the same shapes the Frontend uses (src/lib/domain/types.ts).

import type { Booking, City, RateBand, Sport, Venue } from "../domain/types.ts";
import type { Prisma } from "../generated/prisma/client.ts";

export const venueInclude = {
  courts: { orderBy: { id: "asc" } },
  rateBands: { orderBy: { fromHour: "asc" } },
} satisfies Prisma.VenueInclude;

export type VenueRow = Prisma.VenueGetPayload<{ include: typeof venueInclude }>;

export function toVenue(row: VenueRow): Venue {
  const pricing: Partial<Record<Sport, RateBand[]>> = {};
  for (const b of row.rateBands) {
    (pricing[b.sport] ??= []).push({ from: b.fromHour, to: b.toHour, price: b.price, label: b.label });
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city as City,
    area: row.area,
    address: row.address,
    description: row.description,
    amenities: row.amenities,
    courts: row.courts.map((c) => ({ id: c.id, name: c.name, sport: c.sport })),
    openHour: row.openHour,
    closeHour: row.closeHour,
    pricing,
    cancellation: { freeUntilHours: row.freeCancelHours, lateRefundPercent: row.lateRefundPercent },
    payAtVenue: row.payAtVenue,
    ...(row.photoSrc
      ? {
          photo: {
            src: row.photoSrc,
            alt: row.photoAlt ?? "",
            credit: row.photoCredit ?? "",
            creditUrl: row.photoCreditUrl ?? "",
          },
        }
      : {}),
  };
}

export const bookingInclude = { customer: true } satisfies Prisma.BookingInclude;
export type BookingRow = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

/** Prisma returns @db.Date as UTC midnight. */
export const dateToISO = (d: Date) => d.toISOString().slice(0, 10);
export const isoToDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

export function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    ref: row.ref,
    venueId: row.venueId,
    courtId: row.courtId,
    date: dateToISO(row.date),
    start: row.startHour,
    hours: row.hours,
    price: row.price,
    customer: { name: row.customer.name, phone: row.customer.phone },
    payment: row.payment,
    paid: row.paid,
    status: row.status,
    source: row.source === "walk_in" ? "walk-in" : "online",
    createdAt: row.createdAt.toISOString(),
    ...(row.cancelledAt ? { cancelledAt: row.cancelledAt.toISOString() } : {}),
    ...(row.refund !== null ? { refund: row.refund } : {}),
  };
}
