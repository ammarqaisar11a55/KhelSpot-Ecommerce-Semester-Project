"use client";

import { useState } from "react";
import {
  BOOKED,
  DAYS,
  PEAK_RATE,
  SLOTS,
  formatRupees,
  longTime,
  rateFor,
  type DayKey,
  type Slot,
} from "@/lib/sample-booking";

/** Pick a slot that is free on `day`, keeping `wanted` when possible. */
function freeSlot(day: DayKey, wanted: Slot): Slot {
  const booked = BOOKED[day];
  if (!booked.includes(wanted)) return wanted;
  return (
    SLOTS.find((s) => !booked.includes(s) && rateFor(s) === PEAK_RATE) ??
    SLOTS.find((s) => !booked.includes(s)) ??
    wanted
  );
}

export function BookingPreview() {
  const [day, setDay] = useState<DayKey>("Fri");
  const [slot, setSlot] = useState<Slot>("9 PM");
  const [toast, setToast] = useState("");

  const booked = BOOKED[day];
  const date = DAYS.find((d) => d.key === day)!.date;

  const chooseDay = (next: DayKey) => {
    setDay(next);
    setSlot((current) => freeSlot(next, current));
    setToast("");
  };

  const chooseSlot = (next: Slot) => {
    setSlot(next);
    setToast("");
  };

  return (
    <section className="booker" aria-label="Booking preview with sample data">
      <div className="booker__head">
        <div>
          <p className="booker__venue">Sample Padel Arena</p>
          <p className="booker__meta">DHA, Lahore · Court 2 · Indoor</p>
        </div>
        <span className="tag">Preview</span>
      </div>

      <div className="booker__days" role="group" aria-label="Day">
        {DAYS.map((d) => (
          <button
            key={d.key}
            type="button"
            className={`day${d.key === day ? " is-on" : ""}`}
            aria-pressed={d.key === day}
            onClick={() => chooseDay(d.key)}
          >
            {d.key}
            <b>{d.date}</b>
          </button>
        ))}
      </div>

      <div className="booker__slots" role="group" aria-label="Time slots">
        {SLOTS.map((s) => {
          const taken = booked.includes(s);
          const peak = rateFor(s) === PEAK_RATE;
          const on = s === slot;
          return (
            <button
              key={s}
              type="button"
              className={`slot${peak ? " slot--peak" : ""}${on ? " is-on" : ""}`}
              disabled={taken}
              aria-pressed={on}
              aria-label={`${s}, ${taken ? "booked" : formatRupees(rateFor(s))}`}
              onClick={() => chooseSlot(s)}
            >
              {s}
            </button>
          );
        })}
      </div>

      <div className="booker__legend">
        <span>
          <i className="dot dot--free" />
          Free
        </span>
        <span>
          <i className="dot dot--taken" />
          Booked
        </span>
        <span>
          <i className="dot dot--peak" />
          Peak rate
        </span>
      </div>

      <div className="booker__sum">
        <div>
          <p className="booker__when">
            {day} {date} · {longTime(slot)} · 1 hr
          </p>
          <p className="booker__rule">Free cancellation up to 6 hours before</p>
        </div>
        <p className="booker__price">{formatRupees(rateFor(slot))}</p>
      </div>

      <button
        type="button"
        className="btn btn--accent btn--block"
        onClick={() =>
          setToast(`This is a preview. At launch, ${day} ${longTime(slot)} would now be confirmed and sent to your WhatsApp.`)
        }
      >
        Pay and confirm
      </button>
      <p className="booker__pay">JazzCash · Easypaisa · Card</p>
      <p className="booker__toast" role="status" aria-live="polite">
        {toast}
      </p>
    </section>
  );
}
