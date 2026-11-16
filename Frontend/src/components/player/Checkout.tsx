"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import ui from "@/components/ui/ui.module.css";
import { getVenueById } from "@/lib/catalog/venues";
import { PK_MOBILE, cx, normalisePhone } from "@/lib/format";
import { useBrowserOnly, useNow } from "@/lib/hooks";
import { describePolicy, formatRupees } from "@/lib/domain/pricing";
import { formatDay, formatRange, realDate } from "@/lib/domain/time";
import { PAYMENT_LABEL, SPORT_LABEL, type PaymentMethod } from "@/lib/domain/types";
import { bookingsFor, maxHoursFrom, quotePrice, slotsFor, venueWithSettings } from "@/lib/store/queries";
import { BookingError, createBooking, useStore } from "@/lib/store/store";
import s from "./player.module.css";

const PAY_NOTES: Record<PaymentMethod, string> = {
  jazzcash: "Approve on your phone",
  easypaisa: "Approve on your phone",
  card: "Secure payment page",
  cash: "Slot held, pay at the counter",
};

export function Checkout({ venueId }: { venueId: string }) {
  useBrowserOnly();
  const params = useSearchParams();
  const router = useRouter();
  const state = useStore();
  const now = useNow();

  const base = getVenueById(venueId)!;
  const venue = venueWithSettings(state, base);
  const court = venue.courts.find((c) => c.id === params.get("court"));
  const date = params.get("date") ?? "";
  const start = Number(params.get("start"));
  const hours = Number(params.get("hours"));

  const [payment, setPayment] = useState<PaymentMethod>("jazzcash");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);

  const valid =
    !!court && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isInteger(start) && Number.isInteger(hours) && hours >= 1 && hours <= 3;
  const slots = valid ? slotsFor(venue, court, bookingsFor(state, base, date), date, now) : [];
  const stillFree = valid && maxHoursFrom(slots, start) >= hours;
  const price = valid ? quotePrice(venue, court, start, hours) : null;

  if (!valid || price === null || (!stillFree && !busy)) {
    return (
      <div className={ui.empty}>
        <p>
          {valid && !stillFree
            ? "This slot isn't free any more. Someone may have just booked it, or the time has passed."
            : "We couldn't read that booking. Please pick a slot again."}
        </p>
        <Link className="btn btn--accent" href={`/venues/${venue.slug}`}>
          Back to {venue.name}
        </Link>
      </div>
    );
  }

  const methods = (["jazzcash", "easypaisa", "card", "cash"] as const).filter((m) => m !== "cash" || venue.payAtVenue);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!court) return;
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const phone = normalisePhone(String(data.get("phone") ?? ""));
    const next: Record<string, string> = {};
    if (!name) next.name = "Add your name so the venue knows who's coming.";
    if (!PK_MOBILE.test(phone)) next.phone = "Use a Pakistani mobile number, like 0300 1234567.";
    if (!agree) next.agree = "Please confirm you've read the cancellation rules.";
    setErrors(next);
    setFailure("");
    if (Object.keys(next).length) return;

    setBusy(true);
    // Stand-in for the payment provider round trip.
    await new Promise((r) => setTimeout(r, payment === "cash" ? 400 : 1200));
    try {
      const booking = createBooking({
        venueId: venue.id,
        courtId: court.id,
        date,
        start,
        hours,
        customer: { name, phone },
        payment,
        source: "online",
        mine: true,
      });
      router.push(`/bookings/${booking.ref}?new=1`);
    } catch (err) {
      setBusy(false);
      setFailure(err instanceof BookingError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className={s.checkoutGrid}>
      <form className={s.formStack} noValidate onSubmit={onSubmit}>
        <div className={ui.card}>
          <h2 className={ui.cardTitle}>Your details</h2>
          <div className={s.formStack}>
            <label className={ui.field}>
              <span>Name</span>
              <input
                className={ui.input}
                name="name"
                autoComplete="name"
                defaultValue={state.profile?.name ?? ""}
                aria-invalid={!!errors.name || undefined}
                aria-describedby={errors.name ? "err-name" : undefined}
              />
              {errors.name && <span id="err-name" className={ui.error}>{errors.name}</span>}
            </label>
            <label className={ui.field}>
              <span>WhatsApp number</span>
              <input
                className={ui.input}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="03XX XXXXXXX"
                defaultValue={state.profile?.phone ?? ""}
                aria-invalid={!!errors.phone || undefined}
                aria-describedby={errors.phone ? "err-phone" : "hint-phone"}
              />
              {errors.phone ? (
                <span id="err-phone" className={ui.error}>{errors.phone}</span>
              ) : (
                <span id="hint-phone" className={ui.hint}>Your confirmation is sent here by WhatsApp and SMS.</span>
              )}
            </label>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className={ui.cardTitle}>Payment</h2>
          <fieldset className={s.payOptions}>
            <legend className="sr-only">Payment method</legend>
            {methods.map((m) => (
              <label key={m} className={s.payOption}>
                <input type="radio" name="payment" value={m} checked={payment === m} onChange={() => setPayment(m)} />
                {PAYMENT_LABEL[m]}
                <span className={s.payNote}>{PAY_NOTES[m]}</span>
              </label>
            ))}
          </fieldset>
        </div>

        <div className={ui.card}>
          <h2 className={ui.cardTitle}>Cancellation and refunds</h2>
          <p className={s.policy}>{describePolicy(venue.cancellation)}</p>
          <label className={s.check} style={{ marginTop: 14 }}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              aria-invalid={!!errors.agree || undefined}
              aria-describedby={errors.agree ? "err-agree" : undefined}
            />
            <span>I&apos;ve read the cancellation rules for this booking.</span>
          </label>
          {errors.agree && <p id="err-agree" className={ui.error} style={{ marginTop: 8 }}>{errors.agree}</p>}
        </div>

        {failure && (
          <p className={ui.error} role="alert">
            {failure}
          </p>
        )}

        <button className="btn btn--accent btn--block" type="submit" disabled={busy} aria-busy={busy}>
          {busy
            ? payment === "cash"
              ? "Holding your slot…"
              : `Waiting for ${PAYMENT_LABEL[payment]}…`
            : payment === "cash"
              ? "Confirm booking"
              : `Pay ${formatRupees(price)}`}
        </button>
        <p className={s.testNote}>Demo mode: no payment is taken and no message is sent.</p>
      </form>

      <aside className={cx(ui.card, s.summary)} aria-label="Booking summary">
        <h2 className={ui.cardTitle}>{venue.name}</h2>
        <div className={s.summaryRow}>
          <span className={ui.muted}>Court</span>
          <span>
            {court.name} · {SPORT_LABEL[court.sport]}
          </span>
        </div>
        <div className={s.summaryRow}>
          <span className={ui.muted}>Day</span>
          <span>{formatDay(realDate(date, start))}</span>
        </div>
        <div className={s.summaryRow}>
          <span className={ui.muted}>Time</span>
          <span>{formatRange(start, hours)}</span>
        </div>
        <div className={s.summaryTotal}>
          <span>Total</span>
          <span className={s.total}>{formatRupees(price)}</span>
        </div>
        <Link className={ui.btnLight} href={`/venues/${venue.slug}`}>
          Change time
        </Link>
      </aside>
    </div>
  );
}
