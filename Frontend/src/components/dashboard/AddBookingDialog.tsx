"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import ui from "@/components/ui/ui.module.css";
import { PK_MOBILE, normalisePhone } from "@/lib/format";
import { formatRupees, priceFor } from "@/lib/domain/pricing";
import { formatHour } from "@/lib/domain/time";
import { PAYMENT_LABEL, PAYMENT_METHODS, type Hour, type ISODate, type PaymentMethod, type Venue } from "@/lib/domain/types";
import { BookingError, createBooking, markPaid } from "@/lib/store/store";
import d from "./dashboard.module.css";

export interface AddBookingPreset {
  courtId?: string;
  date: ISODate;
  start?: Hour;
}

interface Props {
  preset: AddBookingPreset | null;
  venue: Venue;
  onClose: () => void;
}

export function AddBookingDialog({ preset, venue, onClose }: Props) {
  return (
    <Modal open={!!preset} title="Add a booking" onClose={onClose}>
      {preset && <AddBookingForm key={JSON.stringify(preset)} preset={preset} venue={venue} onDone={onClose} />}
    </Modal>
  );
}

function AddBookingForm({ preset, venue, onDone }: { preset: AddBookingPreset; venue: Venue; onDone: () => void }) {
  const [courtId, setCourtId] = useState(preset.courtId ?? venue.courts[0].id);
  const [date, setDate] = useState(preset.date);
  const [start, setStart] = useState<Hour>(preset.start ?? Math.max(venue.openHour, 19));
  const [hours, setHours] = useState(1);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [paidNow, setPaidNow] = useState(false);
  const [error, setError] = useState("");

  const court = venue.courts.find((c) => c.id === courtId)!;
  const price = priceFor(venue.pricing[court.sport], start, hours);
  const startOptions: Hour[] = [];
  for (let h = venue.openHour; h < venue.closeHour; h++) startOptions.push(h);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const phone = normalisePhone(String(data.get("phone") ?? ""));
    if (!name) return setError("Add the player's name.");
    if (!PK_MOBILE.test(phone)) return setError("Add a Pakistani mobile number, like 0300 1234567.");
    try {
      const booking = createBooking({
        venueId: venue.id,
        courtId,
        date,
        start,
        hours,
        customer: { name, phone },
        payment,
        source: "walk-in",
      });
      if (payment === "cash" && paidNow) markPaid(booking);
      onDone();
    } catch (err) {
      setError(err instanceof BookingError ? err.message : "Couldn't add the booking.");
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <div className={d.formRow}>
        <div className={ui.field}>
          <span>Court</span>
          <Select label="Court" value={courtId} onChange={setCourtId} options={venue.courts.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
        <label className={ui.field}>
          <span>Day</span>
          <input className={ui.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      <div className={d.formRow}>
        <div className={ui.field}>
          <span>Start</span>
          <Select label="Start" value={start} onChange={setStart} options={startOptions.map((h) => ({ value: h, label: formatHour(h) }))} />
        </div>
        <div className={ui.field}>
          <span>Length</span>
          <Select
            label="Length"
            value={hours}
            onChange={setHours}
            options={[1, 2, 3].map((h) => ({ value: h, label: `${h} ${h === 1 ? "hour" : "hours"}` }))}
          />
        </div>
      </div>
      <div className={d.formRow}>
        <label className={ui.field}>
          <span>Player name</span>
          <input className={ui.input} name="name" autoComplete="off" required />
        </label>
        <label className={ui.field}>
          <span>Phone</span>
          <input className={ui.input} name="phone" type="tel" inputMode="tel" placeholder="03XX XXXXXXX" required />
        </label>
      </div>
      <div className={ui.field}>
        <span>Payment</span>
        <Select
          label="Payment"
          value={payment}
          onChange={setPayment}
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: m === "cash" ? "Cash at the counter" : `${PAYMENT_LABEL[m]} (already paid)` }))}
        />
      </div>
      {payment === "cash" && (
        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} style={{ width: 24, height: 24, accentColor: "var(--turf)" }} />
          Cash already received
        </label>
      )}
      <p>
        Price: <b>{price !== null ? formatRupees(price) : "no rate set for part of this time"}</b>
      </p>
      {error && (
        <p className={ui.error} role="alert">
          {error}
        </p>
      )}
      <div className={ui.buttonRow}>
        <button className={ui.btnDark} type="submit" disabled={price === null}>
          Add booking
        </button>
        <button className={ui.btnLight} type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
