// Shared booking domain, copied from Server/src/domain/pricing.ts (itself a copy of Frontend/src/lib/domain).
// The mobile app imports it from here; Frontend and Server should move to this copy next.

import { formatDay, formatHourLong, hoursUntil, slotStart, toISODate } from "./time";
import type { Booking, CancellationPolicy, Hour, RateBand } from "./types";

export function rateAt(bands: RateBand[] | undefined, hour: Hour): RateBand | undefined {
  return bands?.find((b) => hour >= b.from && hour < b.to);
}

/** Total price for `hours` starting at `start`, summed hour by hour. Null if any hour has no rate. */
export function priceFor(bands: RateBand[] | undefined, start: Hour, hours: number): number | null {
  let total = 0;
  for (let h = start; h < start + hours; h++) {
    const band = rateAt(bands, h);
    if (!band) return null;
    total += band.price;
  }
  return total;
}

export function lowestRate(bands: RateBand[] | undefined): number | null {
  if (!bands?.length) return null;
  return Math.min(...bands.map((b) => b.price));
}

export function formatRupees(amount: number): string {
  return `Rs ${Math.round(amount).toLocaleString("en-PK")}`;
}

export interface RefundQuote {
  canCancel: boolean;
  percent: number;
  amount: number;
  reason: string;
}

export function refundQuote(
  booking: Pick<Booking, "date" | "start" | "price" | "paid">,
  policy: CancellationPolicy,
  now: Date = new Date(),
): RefundQuote {
  const left = hoursUntil(booking.date, booking.start, now);
  if (left <= 0) {
    return { canCancel: false, percent: 0, amount: 0, reason: "This booking has already started." };
  }
  const percent = left >= policy.freeUntilHours ? 100 : policy.lateRefundPercent;
  const amount = booking.paid ? Math.round((booking.price * percent) / 100) : 0;
  const reason =
    percent === 100
      ? `More than ${policy.freeUntilHours} hours before start, so the full amount comes back.`
      : `Less than ${policy.freeUntilHours} hours before start, so ${percent}% comes back.`;
  return { canCancel: true, percent, amount, reason };
}

/** Clock time of the free-cancellation deadline, e.g. "6:00 PM Fri 15 Nov" (from the web app). */
export function cancelDeadline(date: string, start: number, policy: CancellationPolicy): string {
  const d = slotStart(date, start - policy.freeUntilHours);
  return `${formatHourLong(d.getHours() + d.getMinutes() / 60)} ${formatDay(toISODate(d))}`;
}

/** Player-facing refund line for one slot, with the deadline as a clock time. */
export function deadlineText(date: string, start: number, policy: CancellationPolicy): string {
  const late =
    policy.lateRefundPercent > 0
      ? `After that, ${policy.lateRefundPercent}% back until the start.`
      : "After that, no refund.";
  return `Free cancellation until ${cancelDeadline(date, start, policy)}. Full refund in 3–5 working days. ${late}`;
}

/**
 * What cancelling gets back, said for this slot right now: the free-cancellation
 * deadline while it is still ahead, otherwise the late refund that applies.
 */
export function refundLine(date: string, start: number, policy: CancellationPolicy, now: Date = new Date()): string {
  if (hoursUntil(date, start, now) >= policy.freeUntilHours) return deadlineText(date, start, policy);
  return policy.lateRefundPercent > 0
    ? `Starts in under ${policy.freeUntilHours} hours, so cancelling gets ${policy.lateRefundPercent}% back.`
    : `Starts in under ${policy.freeUntilHours} hours, so this booking can't be refunded.`;
}

export function describePolicy(policy: CancellationPolicy): string {
  const late =
    policy.lateRefundPercent > 0
      ? `After that, ${policy.lateRefundPercent}% is refunded until the start time.`
      : "After that, the booking can't be refunded.";
  return `Free cancellation up to ${policy.freeUntilHours} hours before. ${late}`;
}
