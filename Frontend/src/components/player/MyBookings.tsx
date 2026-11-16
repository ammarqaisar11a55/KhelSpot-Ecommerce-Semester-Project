"use client";

import Link from "next/link";
import { useState } from "react";
import ui from "@/components/ui/ui.module.css";
import { cx } from "@/lib/format";
import { useBrowserOnly, useNow } from "@/lib/hooks";
import { formatRupees } from "@/lib/domain/pricing";
import { dayOfMonth, formatRange, realDate, weekdayShort } from "@/lib/domain/time";
import { SPORT_LABEL, type Booking } from "@/lib/domain/types";
import { courtOf, isFinished, myBookings, venueOf } from "@/lib/store/queries";
import { useStore } from "@/lib/store/store";
import { CancelDialog } from "./CancelDialog";
import s from "./player.module.css";
import { StatusBadge, bookingState } from "./StatusBadge";

export function MyBookings() {
  useBrowserOnly();
  const state = useStore();
  const now = useNow();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancelling, setCancelling] = useState<Booking | null>(null);

  const all = myBookings(state);
  const upcoming = all
    .filter((b) => b.status === "confirmed" && !isFinished(b, now))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  const past = all
    .filter((b) => b.status === "cancelled" || isFinished(b, now))
    .sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start);
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <>
      <div className={s.tabs} role="tablist" aria-label="Bookings">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={cx(s.tab, tab === t && s.tabOn)}
            onClick={() => setTab(t)}
          >
            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past and cancelled (${past.length})`}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className={ui.empty}>
          <p>{tab === "upcoming" ? "No upcoming games yet." : "Nothing here yet."}</p>
          <Link className="btn btn--accent" href="/venues">
            Find a court
          </Link>
        </div>
      ) : (
        <div className={s.bookingList} role="tabpanel">
          {list.map((b) => {
            const venue = venueOf(state, b);
            const court = venue && courtOf(venue, b.courtId);
            const canCancel = bookingState(b, now) === "confirmed" || bookingState(b, now) === "unpaid";
            return (
              <article key={b.id} className={s.bookingCard}>
                <div className={s.dateBadge}>
                  {weekdayShort(realDate(b.date, b.start))}
                  <b>{dayOfMonth(realDate(b.date, b.start))}</b>
                </div>
                <div>
                  <p className={s.bookingTitle}>
                    <Link href={`/bookings/${b.ref}`}>{venue?.name}</Link>
                  </p>
                  <p className={s.bookingMeta}>
                    {court?.name} · {court && SPORT_LABEL[court.sport]} · {formatRange(b.start, b.hours)}
                  </p>
                  <p className={s.bookingMeta}>
                    <span className={ui.mono}>{b.ref}</span> · {formatRupees(b.price)}
                    {b.status === "cancelled" && b.refund ? ` · ${formatRupees(b.refund)} refunded` : ""}
                  </p>
                </div>
                <div className={ui.buttonRow} style={{ alignItems: "center" }}>
                  <StatusBadge booking={b} now={now} />
                  {canCancel && tab === "upcoming" && (
                    <button type="button" className={ui.btnLight} onClick={() => setCancelling(b)}>
                      Cancel
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <CancelDialog
        booking={cancelling}
        venue={cancelling ? venueOf(state, cancelling) : undefined}
        by="player"
        onClose={() => setCancelling(null)}
      />
    </>
  );
}
