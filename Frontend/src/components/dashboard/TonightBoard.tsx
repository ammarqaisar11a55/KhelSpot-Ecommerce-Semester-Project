"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cx } from "@/lib/format";
import { formatRupees } from "@/lib/domain/pricing";
import { formatHour, formatRange, isPast } from "@/lib/domain/time";
import type { Booking, ISODate, Venue } from "@/lib/domain/types";
import { isFinished } from "@/lib/store/queries";
import type { AddBookingPreset } from "./AddBookingDialog";
import d from "./dashboard.module.css";

interface Props {
  venue: Venue;
  today: ISODate;
  /** Today's bookings that still count: not cancelled. */
  bookings: Booking[];
  now: Date;
  /** The current hour on the operating day, past 24 after midnight. */
  nowHour: number | null;
  onSelect: (id: string) => void;
  onAdd: (preset: AddBookingPreset) => void;
}

/**
 * Tonight at a glance: one lane per court from opening to closing, each
 * booking drawn where it falls. Yellow marks money still to collect, the
 * same meaning it has in the calendar.
 */
export function TonightBoard({ venue, today, bookings, now, nowHour, onSelect, onAdd }: Props) {
  const { openHour, closeHour, courts } = venue;
  const hours = Array.from({ length: closeHour - openHour }, (_, i) => openHour + i);
  const span = closeHour - openHour;
  const revenue = bookings.reduce((sum, b) => sum + b.price, 0);
  const toStart = bookings.filter((b) => !isPast(b.date, b.start, now)).length;
  const showNow = nowHour !== null && nowHour >= openHour && nowHour < closeHour;
  const column = (hour: number) => hour - openHour + 2; // column 1 holds the court names
  const scroller = useRef<HTMLDivElement>(null);
  const nowShare = showNow ? (nowHour - openHour) / span : null;

  // On a narrow screen the board scrolls sideways: open it at the current
  // hour rather than at opening time, once, without fighting the reader.
  useEffect(() => {
    const element = scroller.current;
    if (!element || nowShare === null || element.scrollWidth <= element.clientWidth) return;
    const lanes = element.scrollWidth - 118;
    element.scrollLeft = Math.max(0, 118 + lanes * nowShare - element.clientWidth / 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={d.board} aria-labelledby="tonight-title">
      <div className={d.boardHead}>
        <div>
          <h2 id="tonight-title" className={d.boardTitle}>
            Tonight
          </h2>
          <p className={d.boardSub}>
            {formatHour(openHour)} to {formatHour(closeHour)} on {courts.length} {courts.length === 1 ? "court" : "courts"}
          </p>
        </div>
        <dl className={d.boardFigures}>
          <div>
            <dt>Bookings</dt>
            <dd>{bookings.length}</dd>
          </div>
          <div>
            <dt>Still to start</dt>
            <dd>{toStart}</dd>
          </div>
          <div>
            <dt>Booked tonight</dt>
            <dd>{formatRupees(revenue)}</dd>
          </div>
        </dl>
      </div>

      <div className={d.boardScroll} ref={scroller}>
        <div
          className={d.boardGrid}
          style={{ "--hours": span } as CSSProperties}
        >
          <div className={d.boardAxis} aria-hidden="true">
            {hours.map((h, i) =>
              i % 2 === 0 ? (
                <span key={h} style={{ gridColumn: column(h) }}>
                  {formatHour(h)}
                </span>
              ) : null,
            )}
          </div>

          {courts.map((court, row) => {
            const lane = bookings.filter((b) => b.courtId === court.id);
            const taken = new Set(lane.flatMap((b) => Array.from({ length: b.hours }, (_, i) => b.start + i)));
            const gridRow = row + 2; // row 1 holds the hour labels
            return (
              <div key={court.id} className={d.boardLane}>
                <span className={d.boardCourt} style={{ gridRow }}>
                  {court.name}
                </span>
                <span className={d.boardTrack} style={{ gridRow }} aria-hidden="true" />
                {hours.map((h) =>
                  taken.has(h) || (nowHour !== null && h + 1 <= nowHour) ? null : (
                    <button
                      key={h}
                      type="button"
                      className={d.boardFree}
                      style={{ gridRow, gridColumn: column(h) }}
                      aria-label={`Add a booking on ${court.name} at ${formatHour(h)}`}
                      onClick={() => onAdd({ date: today, courtId: court.id, start: h })}
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  ),
                )}
                {lane.map((b) => {
                  const played = isFinished(b, now);
                  const collect = !b.paid;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={cx(d.boardBooking, collect ? d.boardCollect : d.boardPaid, played && d.boardPlayed)}
                      style={{ gridRow, gridColumn: `${column(b.start)} / span ${b.hours}` }}
                      title={`${b.customer.name}, ${formatRange(b.start, b.hours)}${collect ? `, ${formatRupees(b.price)} to collect` : ""}`}
                      aria-label={`${b.customer.name} on ${court.name}, ${formatRange(b.start, b.hours)}, ${
                        collect ? `${formatRupees(b.price)} to collect` : "paid"
                      }${played ? ", played" : ""}`}
                      onClick={() => onSelect(b.id)}
                    >
                      <span className={d.boardName}>{b.customer.name}</span>
                      <span className={d.boardWhen}>{formatHour(b.start)}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {showNow && (
            <div className={d.boardNowTrack} style={{ gridRow: `2 / span ${courts.length}` }} aria-hidden="true">
              <span className={d.boardNow} style={{ left: `${((nowHour - openHour) / span) * 100}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className={d.boardKey}>
        <span>
          <i className={d.keyBoardPaid} aria-hidden="true" /> Paid
        </span>
        <span>
          <i className={d.keyBoardCollect} aria-hidden="true" /> To collect at the counter
        </span>
        {showNow && (
          <span>
            <i className={d.keyBoardNow} aria-hidden="true" /> Now, {formatHour(Math.floor(nowHour * 4) / 4)}
          </span>
        )}
        <span className={d.boardHint}>Select a booking to open it, or an empty hour to add one.</span>
      </div>
    </section>
  );
}
