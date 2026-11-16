import ui from "@/components/ui/ui.module.css";
import { cx } from "@/lib/format";
import type { Booking } from "@/lib/domain/types";
import { isFinished } from "@/lib/store/queries";

export function bookingState(b: Booking, now: Date): "cancelled" | "played" | "unpaid" | "confirmed" {
  if (b.status === "cancelled") return "cancelled";
  if (isFinished(b, now)) return "played";
  if (!b.paid) return "unpaid";
  return "confirmed";
}

export function StatusBadge({ booking, now, owner = false }: { booking: Booking; now: Date; owner?: boolean }) {
  const st = bookingState(booking, now);
  const label = { cancelled: "Cancelled", played: "Played", unpaid: owner ? "Unpaid" : "Pay at venue", confirmed: "Confirmed" }[st];
  const tone = { cancelled: ui.badgeRed, played: undefined, unpaid: ui.badgeYellow, confirmed: ui.badgeGreen }[st];
  return <span className={cx(ui.badge, tone)}>{label}</span>;
}
