"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import ui from "@/components/ui/ui.module.css";
import { cx } from "@/lib/format";
import { formatRupees } from "@/lib/domain/pricing";
import { addDays, formatDay, formatHour, formatRange, isPast, operatingNow, relativeDay } from "@/lib/domain/time";
import { SPORT_LABEL, type Booking } from "@/lib/domain/types";
import { bookingsFor, isActive, isFinished } from "@/lib/store/queries";
import { AddBookingDialog, type AddBookingPreset } from "./AddBookingDialog";
import { BookingDialog } from "./BookingDialog";
import d from "./dashboard.module.css";
import { useOwnerVenue } from "./useOwnerVenue";

const ROW_PX = 56;

function WalkInIcon() {
  return (
    <svg className={d.calWalkIn} viewBox="0 0 16 16" role="img" aria-label="Added at the counter">
      <path d="M2 13h12M4 13V7h8v6M6.5 7V4.5h3V7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function OwnerCalendar() {
  const { state, now, base, venue, today } = useOwnerVenue();
  const [date, setDate] = useState(today);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<AddBookingPreset | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const all = useMemo(() => bookingsFor(state, base, date), [state, base, date]);
  const active = all.filter(isActive);
  const selected: Booking | null = all.find((b) => b.id === selectedId) ?? null;

  const { openHour, closeHour, courts } = venue;
  const hours: number[] = [];
  for (let h = openHour; h < closeHour; h++) hours.push(h);
  const row = (h: number) => h - openHour + 2; // grid row 1 is the court header
  const openHoursPerCourt = closeHour - openHour;

  const taken = new Set(active.flatMap((b) => Array.from({ length: b.hours }, (_, i) => `${b.courtId}:${b.start + i}`)));
  const bookedHours = active.reduce((s, b) => s + b.hours, 0);
  const revenue = active.reduce((s, b) => s + b.price, 0);
  const toCollect = active.filter((b) => !b.paid).reduce((s, b) => s + b.price, 0);

  // Where "now" sits on this day's grid.
  const nowOp = operatingNow(now);
  const isToday = date === nowOp.date;
  const nowInDay = isToday && nowOp.hour >= openHour && nowOp.hour < closeHour;
  const pastUntil = date < nowOp.date ? closeHour : isToday ? Math.min(Math.max(Math.floor(nowOp.hour), openHour), closeHour) : openHour;

  // Bring the now line into view when today's grid opens.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = nowInDay ? Math.max(0, (nowOp.hour - openHour - 1.5) * ROW_PX) : 0;
    // Only on day change, not every clock tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const dayTitle = relativeDay(date, today) === formatDay(date) ? formatDay(date) : `${relativeDay(date, today)}, ${formatDay(date)}`;

  return (
    <>
      <div className={ui.pageHead}>
        <div>
          <h1 className={ui.title}>Calendar</h1>
          <p className={ui.subtitle}>
            {active.length} bookings, {bookedHours} of {openHoursPerCourt * courts.length} court-hours booked,{" "}
            {formatRupees(revenue)} in total
            {toCollect > 0 && <>. {formatRupees(toCollect)} still to collect at the counter.</>}
          </p>
        </div>
        <button type="button" className="btn btn--accent" onClick={() => setAdding({ date })}>
          Add a booking
        </button>
      </div>

      <div className={d.calBar}>
        <div className={d.calStep} role="group" aria-label="Change day">
          <button type="button" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
          </button>
          <button type="button" onClick={() => setDate(today)} disabled={date === today}>
            Today
          </button>
          <button type="button" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
          </button>
        </div>
        <h2 className={d.calDate} aria-live="polite">
          {dayTitle}
        </h2>
        <label className={d.calPick}>
          <span className="sr-only">Go to date</span>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <div className={d.calKey} aria-label="Key">
          <span><i className={d.keyPaid} />Paid</span>
          <span><i className={d.keyCollect} />Collect at the counter</span>
          <span><WalkInIcon />Added at the counter</span>
        </div>
      </div>

      <div className={d.calWrap} ref={scroller}>
        <div
          className={d.cal}
          style={{
            gridTemplateColumns: `78px repeat(${courts.length}, minmax(170px, 1fr))`,
            gridTemplateRows: `auto repeat(${hours.length}, ${ROW_PX}px)`,
          }}
        >
          <div className={d.calCorner} style={{ gridColumn: 1, gridRow: 1 }} />
          {courts.map((c, i) => {
            const used = active.filter((b) => b.courtId === c.id).reduce((s, b) => s + b.hours, 0);
            return (
              <div key={c.id} className={d.calCourt} style={{ gridColumn: i + 2, gridRow: 1 }}>
                <span className={d.calCourtName}>{c.name}</span>
                <span className={d.calCourtMeta}>
                  {SPORT_LABEL[c.sport]}, {used} of {openHoursPerCourt} hours booked
                </span>
                <span className={d.calMeter} aria-hidden="true">
                  <span style={{ width: `${(used / openHoursPerCourt) * 100}%` }} />
                </span>
              </div>
            );
          })}

          {/* Hour labels, row lines and column lines */}
          {hours.map((h) => (
            <div key={`h${h}`} className={d.calHour} style={{ gridColumn: 1, gridRow: row(h) }}>
              {formatHour(h)}
            </div>
          ))}
          {hours.map((h) => (
            <div key={`l${h}`} className={d.calRowLine} style={{ gridColumn: `2 / ${courts.length + 2}`, gridRow: row(h) }} aria-hidden="true" />
          ))}
          {courts.map((c, i) => (
            <div key={`c${c.id}`} className={d.calColLine} style={{ gridColumn: i + 2, gridRow: `2 / ${hours.length + 2}` }} aria-hidden="true" />
          ))}

          {/* Hours that have already gone */}
          {pastUntil > openHour && (
            <div
              className={d.calPastShade}
              style={{ gridColumn: `2 / ${courts.length + 2}`, gridRow: `2 / ${row(pastUntil)}` }}
              aria-hidden="true"
            />
          )}

          {/* Free slots you can still book */}
          {hours.map((h) =>
            courts.map((c, i) =>
              taken.has(`${c.id}:${h}`) || isPast(date, h + 1, now) ? null : (
                <button
                  key={`${c.id}:${h}`}
                  type="button"
                  className={d.calSlot}
                  style={{ gridColumn: i + 2, gridRow: row(h) }}
                  aria-label={`Add a booking on ${c.name} at ${formatHour(h)}`}
                  onClick={() => setAdding({ date, courtId: c.id, start: h })}
                >
                  <span>+ {formatHour(h)}</span>
                </button>
              ),
            ),
          )}

          {/* Bookings */}
          {active.map((b) => {
            const col = courts.findIndex((c) => c.id === b.courtId) + 2;
            const played = isFinished(b, now);
            return (
              <button
                key={b.id}
                type="button"
                className={cx(d.calBlock, b.paid ? d.calBlockPaid : d.calBlockDue, played && d.calBlockPlayed)}
                style={{ gridColumn: col, gridRow: `${row(b.start)} / span ${b.hours}` }}
                aria-label={`${b.customer.name}, ${formatRange(b.start, b.hours)}, ${formatRupees(b.price)}, ${b.paid ? "paid" : "not paid yet"}${b.source === "walk-in" ? ", added at the counter" : ""}`}
                onClick={() => setSelectedId(b.id)}
              >
                <span className={d.calBlockName}>{b.customer.name}</span>
                <span className={d.calBlockMeta}>
                  {b.paid ? (
                    <>
                      <span className={d.calPrice}>{formatRupees(b.price)}</span>
                      <span>{b.hours} hr</span>
                    </>
                  ) : (
                    <span className={d.calCollect}>Collect {formatRupees(b.price)}</span>
                  )}
                </span>
                {b.source === "walk-in" && <WalkInIcon />}
              </button>
            );
          })}

          {/* The floodlit now line */}
          {nowInDay && (
            <>
              <div
                className={d.calNow}
                style={{ gridColumn: `2 / ${courts.length + 2}`, gridRow: row(Math.floor(nowOp.hour)), "--now-offset": `${(nowOp.hour % 1) * ROW_PX}px` } as CSSProperties}
                aria-hidden="true"
              />
              <div
                className={d.calNowChip}
                style={{ gridColumn: 1, gridRow: row(Math.floor(nowOp.hour)), "--now-offset": `${(nowOp.hour % 1) * ROW_PX}px` } as CSSProperties}
              >
                <span className="sr-only">Now, </span>
                {formatHour(Math.round(nowOp.hour * 60) / 60)}
              </div>
            </>
          )}
        </div>
      </div>

      <BookingDialog booking={selected} venue={venue} now={now} onClose={() => setSelectedId(null)} />
      <AddBookingDialog preset={adding} venue={venue} onClose={() => setAdding(null)} />
    </>
  );
}
