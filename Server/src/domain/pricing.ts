// Copied from Frontend/src/lib/domain/pricing.ts so prices, refunds and times match exactly.
// Keep the two copies in sync (or move both into a shared package later).

import { hoursUntil } from "./time.ts";
import type { Booking, CancellationPolicy, Hour, RateBand } from "./types.ts";

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

export function describePolicy(policy: CancellationPolicy): string {
  const late =
    policy.lateRefundPercent > 0
      ? `After that, ${policy.lateRefundPercent}% is refunded until the start time.`
      : "After that, the booking can't be refunded.";
  return `Free cancellation up to ${policy.freeUntilHours} hours before. ${late}`;
}
