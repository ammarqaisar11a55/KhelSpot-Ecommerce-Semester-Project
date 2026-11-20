"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import ui from "@/components/ui/ui.module.css";
import { getVenueById, venueSports } from "@/lib/catalog/venues";
import { cx } from "@/lib/format";
import { useBrowserOnly, useNow } from "@/lib/hooks";
import { deadlineText, formatRupees, priceFor, rateAt } from "@/lib/domain/pricing";
import {
  addDays,
  dayOfMonth,
  formatDay,
  formatHour,
  formatRange,
  operatingNow,
  realDate,
  weekdayShort,
} from "@/lib/domain/time";
import { SPORTS, SPORT_LABEL, type Hour, type Sport } from "@/lib/domain/types";
import { bookingsFor, maxHoursFrom, slotsFor, venueWithSettings } from "@/lib/store/queries";
import { useStore } from "@/lib/store/store";
import s from "./player.module.css";
import { VenueLocation } from "./VenueProfileView";

const DURATIONS = [1, 2, 3];

export function SlotPicker({ venueId }: { venueId: string }) {
  useBrowserOnly();
  const params = useSearchParams();
  const state = useStore();
  const now = useNow();

  const base = getVenueById(venueId)!;
  const venue = venueWithSettings(state, base);
  const sports = venueSports(venue);
  const wanted = params.get("sport");
  const initialSport = sports.find((sp) => sp === wanted) ?? sports[0];

  const [sport, setSport] = useState<Sport>(initialSport);
  const courts = venue.courts.filter((c) => c.sport === sport);
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const today = operatingNow(now).date;
  const [dayOffset, setDayOffset] = useState(0);
  const [start, setStart] = useState<Hour | null>(null);
  const [hours, setHours] = useState(1);

  const date = addDays(today, dayOffset);
  const court = venue.courts.find((c) => c.id === courtId) ?? courts[0];
  const bookings = bookingsFor(state, base, date);
  const slots = court ? slotsFor(venue, court, bookings, date, now) : [];

  const room = start === null ? 0 : maxHoursFrom(slots, start);
  const validStart = start !== null && room > 0;
  const span = validStart ? Math.min(hours, room) : 0;
  const bands = court ? venue.pricing[court.sport] : undefined;
  const total = validStart ? priceFor(bands, start, span) : null;

  const reset = () => {
    setStart(null);
    setHours(1);
  };

  const chooseSport = (sp: Sport) => {
    setSport(sp);
    setCourtId(venue.courts.find((c) => c.sport === sp)?.id ?? "");
    reset();
  };

  const freeCount = slots.filter((x) => x.status === "free").length;
  const checkoutHref =
    validStart && court
      ? `/venues/${venue.slug}/checkout?court=${court.id}&date=${date}&start=${start}&hours=${span}`
      : null;

  return (
    <div className={`wrap ${s.venueLayout}`}>
      <div className={s.pickerSection}>
        {sports.length > 1 && (
          <div>
            <p className={s.stepLabel} id="pick-sport">Sport</p>
            <div className={ui.chips} role="group" aria-labelledby="pick-sport">
              {SPORTS.filter((sp) => sports.includes(sp)).map((sp) => (
                <button key={sp} type="button" className={cx(ui.chip, sp === sport && ui.chipOn)} aria-pressed={sp === sport} onClick={() => chooseSport(sp)}>
                  {SPORT_LABEL[sp]}
                </button>
              ))}
            </div>
          </div>
        )}

        {courts.length > 1 && (
          <div>
            <p className={s.stepLabel} id="pick-court">Court</p>
            <div className={ui.chips} role="group" aria-labelledby="pick-court">
              {courts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cx(ui.chip, c.id === court?.id && ui.chipOn)}
                  aria-pressed={c.id === court?.id}
                  onClick={() => {
                    setCourtId(c.id);
                    reset();
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className={s.stepLabel} id="pick-day">Day</p>
          <div className={s.dateStrip} role="group" aria-labelledby="pick-day">
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(today, i);
              return (
                <button
                  key={d}
                  type="button"
                  className={cx(s.dateBtn, i === dayOffset && s.dateBtnOn)}
                  aria-pressed={i === dayOffset}
                  aria-label={formatDay(d)}
                  onClick={() => {
                    setDayOffset(i);
                    reset();
                  }}
                >
                  {i === 0 ? "Today" : weekdayShort(d)}
                  <b>{dayOfMonth(d)}</b>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className={s.stepLabel} id="pick-time">
            Start time · {freeCount} free on {court?.name}
          </p>
          <div className={s.slotGrid} role="group" aria-labelledby="pick-time">
            {slots.map((slot) => {
              const taken = slot.status === "booked";
              const disabled = slot.status !== "free";
              const isStart = slot.hour === start;
              const inRange = validStart && slot.hour > start && slot.hour < start + span;
              const peak = slot.band?.label === "Peak" || slot.band?.label === "Evening";
              const label =
                slot.status === "booked" ? "Booked" : slot.status === "past" ? "Passed" : slot.band ? formatRupees(slot.band.price) : "Closed";
              return (
                <button
                  key={slot.hour}
                  type="button"
                  disabled={disabled}
                  className={cx(s.slot, peak && s.slotPeak, taken && s.slotTaken, isStart && s.slotOn, inRange && s.slotIn)}
                  aria-pressed={isStart}
                  aria-label={`${formatHour(slot.hour)}, ${label}`}
                  onClick={() => {
                    setStart(slot.hour);
                    setHours((h) => Math.min(h, maxHoursFrom(slots, slot.hour)) || 1);
                  }}
                >
                  {formatHour(slot.hour)}
                  <small>{label}</small>
                </button>
              );
            })}
          </div>
          <div className={s.legend}>
            <span><i className={s.swatch} />Free</span>
            <span><i className={cx(s.swatch, s.swatchTaken)} />Booked or passed</span>
            <span><i className={cx(s.swatch, s.swatchPeak)} />Peak rate</span>
            {venue.closeHour > 24 && <span>Slots from 12 AM are the early hours of {formatDay(addDays(date, 1))}.</span>}
          </div>
        </div>

        <div>
          <p className={s.stepLabel} id="pick-hours">How long</p>
          <div className={ui.chips} role="group" aria-labelledby="pick-hours">
            {DURATIONS.map((h) => {
              const fits = start === null || h <= room;
              return (
                <button
                  key={h}
                  type="button"
                  className={cx(ui.chip, span === h && validStart && ui.chipOn)}
                  aria-pressed={span === h && validStart}
                  disabled={!fits}
                  title={fits ? undefined : "The court is booked or closed before then"}
                  onClick={() => setHours(h)}
                  style={fits ? undefined : { opacity: 0.45, cursor: "not-allowed" }}
                >
                  {h} {h === 1 ? "hour" : "hours"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className={s.summary} aria-label="Booking summary">
        <div className={ui.card}>
          <h2 className={ui.cardTitle}>Your booking</h2>
          {validStart && court ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div className={s.summaryRow}>
                <span className={ui.muted}>Court</span>
                <span>{court.name}</span>
              </div>
              <div className={s.summaryRow}>
                <span className={ui.muted}>Day</span>
                <span>{formatDay(realDate(date, start))}</span>
              </div>
              <div className={s.summaryRow}>
                <span className={ui.muted}>Time</span>
                <span>{formatRange(start, span)}</span>
              </div>
              {Array.from({ length: span }, (_, i) => {
                const band = rateAt(bands, start + i);
                return (
                  <div key={i} className={cx(s.summaryRow, ui.small)}>
                    <span className={ui.muted}>
                      {formatHour(start + i)} · {band?.label}
                    </span>
                    <span className={ui.mono}>{band ? formatRupees(band.price) : "–"}</span>
                  </div>
                );
              })}
              <div className={s.summaryTotal}>
                <span>Total</span>
                <span className={s.total}>{total !== null ? formatRupees(total) : "–"}</span>
              </div>
              <p className={s.policy}>{deadlineText(date, start, venue.cancellation)}</p>
              {checkoutHref && (
                <Link className="btn btn--accent btn--block" href={checkoutHref}>
                  Continue to payment
                </Link>
              )}
            </div>
          ) : (
            <p className={ui.muted}>Pick a start time to see the price.</p>
          )}
        </div>

        <div className={ui.card}>
          <h2 className={ui.cardTitle}>Rates for {SPORT_LABEL[sport].toLowerCase()}</h2>
          <div className={s.rates}>
            {(venue.pricing[sport] ?? []).map((b) => (
              <div key={`${b.from}-${b.label}`} className={s.rateRow}>
                <span className={ui.muted}>
                  {b.label}, {formatHour(b.from)} to {formatHour(b.to)}
                </span>
                <span className={ui.mono}>{formatRupees(b.price)}/hr</span>
              </div>
            ))}
          </div>
        </div>
        <VenueLocation venue={venue} />
      </aside>
    </div>
  );
}
