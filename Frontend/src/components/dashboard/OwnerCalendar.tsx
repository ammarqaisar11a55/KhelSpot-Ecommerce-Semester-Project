"use client";

import { Fragment, useMemo, useState } from "react";
import ui from "@/components/ui/ui.module.css";
import { cx } from "@/lib/format";
import { formatRupees } from "@/lib/domain/pricing";
import { addDays, formatDay, formatHour, isPast, relativeDay } from "@/lib/domain/time";
import type { Booking } from "@/lib/domain/types";
import { bookingsFor, isActive } from "@/lib/store/queries";
import { AddBookingDialog, type AddBookingPreset } from "./AddBookingDialog";
import { BookingDialog } from "./BookingDialog";
import d from "./dashboard.module.css";
import { useOwnerVenue } from "./useOwnerVenue";

export function OwnerCalendar() {
  const { state, now, base, venue, today } = useOwnerVenue();
  const [date, setDate] = useState(today);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<AddBookingPreset | null>(null);

  const all = useMemo(() => bookingsFor(state, base, date), [state, base, date]);
  const active = all.filter(isActive);
  const selected: Booking | null = all.find((b) => b.id === selectedId) ?? null;

  const hours: number[] = [];
  for (let h = venue.openHour; h < venue.closeHour; h++) hours.push(h);
  const row = (h: number) => h - venue.openHour + 2; // row 1 is the header

  const taken = new Set(active.flatMap((b) => Array.from({ length: b.hours }, (_, i) => `${b.courtId}:${b.start + i}`)));
  const dayRevenue = active.reduce((s, b) => s + b.price, 0);
  const bookedHours = active.reduce((s, b) => s + b.hours, 0);

  return (
    <>
      <div className={ui.pageHead}>
        <div>
          <h1 className={ui.title}>Calendar</h1>
          <p className={ui.subtitle}>
            {active.length} bookings · {bookedHours} of {hours.length * venue.courts.length} court-hours ·{" "}
            {formatRupees(dayRevenue)}
          </p>
        </div>
        <button type="button" className="btn btn--accent" onClick={() => setAdding({ date })}>
          Add a booking
        </button>
      </div>

      <div className={d.calNav}>
        <button type="button" className={ui.btnLight} onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <button type="button" className={ui.btnLight} onClick={() => setDate(today)} disabled={date === today}>
          Today
        </button>
        <button type="button" className={ui.btnLight} onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
          ›
        </button>
        <h2 className={d.calDate} aria-live="polite">
          {relativeDay(date, today) === formatDay(date) ? formatDay(date) : `${relativeDay(date, today)} · ${formatDay(date)}`}
        </h2>
        <label className="sr-only" htmlFor="cal-date">
          Go to date
        </label>
        <input
          id="cal-date"
          className={ui.input}
          style={{ width: "auto" }}
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
      </div>

      <div className={d.calWrap}>
        <div
          className={d.cal}
          style={{
            gridTemplateColumns: `72px repeat(${venue.courts.length}, minmax(160px, 1fr))`,
            gridTemplateRows: `auto repeat(${hours.length}, 56px)`,
          }}
        >
          <div className={d.calHead} style={{ gridColumn: 1, gridRow: 1 }} />
          {venue.courts.map((c, i) => (
            <div key={c.id} className={d.calHead} style={{ gridColumn: i + 2, gridRow: 1 }}>
              {c.name}
            </div>
          ))}

          {hours.map((h) => (
            <Fragment key={h}>
              <div className={d.calHour} style={{ gridColumn: 1, gridRow: row(h) }}>
                {formatHour(h)}
              </div>
              {venue.courts.map((c, i) => {
                const past = isPast(date, h + 1, now);
                if (taken.has(`${c.id}:${h}`)) {
                  // Covered by a booking block; keep the grid line, no add button underneath.
                  return <div key={c.id} className={d.calCell} style={{ gridColumn: i + 2, gridRow: row(h), cursor: "default" }} aria-hidden="true" />;
                }
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={cx(d.calCell, past && d.calPast)}
                    style={{ gridColumn: i + 2, gridRow: row(h) }}
                    disabled={past}
                    aria-label={`Add booking on ${c.name} at ${formatHour(h)}`}
                    onClick={() => setAdding({ date, courtId: c.id, start: h })}
                  />
                );
              })}
            </Fragment>
          ))}

          {active.map((b) => {
            const col = venue.courts.findIndex((c) => c.id === b.courtId) + 2;
            return (
              <button
                key={b.id}
                type="button"
                className={cx(d.calBooking, !b.paid && d.calUnpaid, b.source === "walk-in" && b.paid && d.calWalkIn)}
                style={{ gridColumn: col, gridRow: `${row(b.start)} / span ${b.hours}` }}
                onClick={() => setSelectedId(b.id)}
              >
                <b>{b.customer.name}</b>
                <span>
                  {formatHour(b.start)} to {formatHour(b.start + b.hours)} · {formatRupees(b.price)}
                </span>
                {!b.paid && <span>Unpaid, collect at counter</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className={d.calLegend}>
        <span>
          <i className={d.legendSwatch} style={{ background: "#dcefe3" }} />
          Paid on KhelSpot
        </span>
        <span>
          <i className={d.legendSwatch} style={{ background: "#fff1bf" }} />
          Unpaid, pay at venue
        </span>
        <span>
          <i className={d.legendSwatch} style={{ background: "var(--night)" }} />
          Added by venue, paid
        </span>
        <span>Click an empty slot to add a booking.</span>
      </div>

      <BookingDialog booking={selected} venue={venue} now={now} onClose={() => setSelectedId(null)} />
      <AddBookingDialog preset={adding} venue={venue} onClose={() => setAdding(null)} />
    </>
  );
}
