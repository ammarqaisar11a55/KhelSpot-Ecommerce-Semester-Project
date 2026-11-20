import Link from "next/link";
import { getVenueById } from "@/lib/catalog/venues";
import { formatRupees, priceFor } from "@/lib/domain/pricing";
import { formatHourLong, formatRange, weekdayShort } from "@/lib/domain/time";
import { PAYMENT_LABEL, SPORT_LABEL } from "@/lib/domain/types";

// Example booking, built from a real listed venue so prices and the
// cancellation deadline follow the catalog. Same facts, same order as the
// confirmation the app sends (brand kit v1.0, "Booking messages").
const EXAMPLE = {
  venueId: "v-night-owl",
  courtId: "no-f2",
  date: "2026-11-21", // a Saturday; only the weekday is shown
  start: 21,
  hours: 1,
  ref: "KS-48213",
  payment: "jazzcash" as const,
};

const BENEFITS = [
  { title: "Booked, not “request sent”", body: "The first word tells you the court is yours. Nothing waits on the venue to reply." },
  { title: "The deadline is a time", body: "Free cancellation until a clock time you can read at a glance, not a rule to work out." },
  { title: "One link for everything", body: "Directions, changes and cancelling all sit behind the same link." },
];

export function Booked() {
  const venue = getVenueById(EXAMPLE.venueId)!;
  const court = venue.courts.find((c) => c.id === EXAMPLE.courtId)!;
  const price = priceFor(venue.pricing[court.sport], EXAMPLE.start, EXAMPLE.hours) ?? 0;
  const day = weekdayShort(EXAMPLE.date);
  const cancelBy = `${formatHourLong(EXAMPLE.start - venue.cancellation.freeUntilHours)} ${day}`;
  const reminderAt = `${formatHourLong(EXAMPLE.start - 2)} ${day}`;
  // "9:00–10:00 PM": the shared AM/PM is written once, as in the kit's message.
  const endLabel = formatHourLong(EXAMPLE.start + EXAMPLE.hours);
  const startLabel = formatHourLong(EXAMPLE.start);
  const timeRange =
    startLabel.slice(-2) === endLabel.slice(-2) ? `${startLabel.slice(0, -3)}–${endLabel}` : `${startLabel}–${endLabel}`;

  return (
    <section className="booked" aria-labelledby="booked-title">
      <div className="wrap booked__grid">
        <figure className="phone" aria-label="Example booking confirmation on WhatsApp">
          <div className="phone__bar">
            <svg className="phone__avatar" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="32" fill="#111513" />
              <path d="M18 14.5h8v14.2L36.3 14.5h9.2L34.6 29.4 46 49.5h-9.3l-7.8-14.4-2.9 3.9v10.5h-8z" fill="#F3F2EC" />
              <circle cx="47" cy="15.5" r="6" fill="#D4F53C" />
            </svg>
            <span>
              <b>KhelSpot</b>
              <small>Booking updates</small>
            </span>
          </div>
          <div className="phone__chat">
            <div className="bubble">
              <p className="bubble__status">
                Booked: {venue.name}, {court.name}
              </p>
              <p>
                {day} · {timeRange}
              </p>
              <p>
                {SPORT_LABEL[court.sport]} · {formatRupees(price)} paid via {PAYMENT_LABEL[EXAMPLE.payment]}
              </p>
              <p>Booking ID {EXAMPLE.ref}</p>
              <p>
                Free cancellation until <b>{cancelBy}</b>. Full refund in 3–5 working days.
              </p>
              <p className="bubble__link">Open booking</p>
              <span className="bubble__time">6:42 PM</span>
            </div>
            <div className="bubble bubble--flood">
              <p className="bubble__status">Game in 2 hours</p>
              <p>
                {venue.name}, {court.name} · {formatHourLong(EXAMPLE.start)}. Directions in your booking.
              </p>
              <span className="bubble__time">{reminderAt}</span>
            </div>
          </div>
          <figcaption className="sr-only">
            A confirmation message reads: Booked, {venue.name}, {court.name}, {day} {formatRange(EXAMPLE.start, EXAMPLE.hours)},
            {formatRupees(price)} paid via {PAYMENT_LABEL[EXAMPLE.payment]}, free cancellation until {cancelBy}.
          </figcaption>
        </figure>

        <div className="booked__copy">
          <p className="eyebrow">After KhelSpot</p>
          <h2 id="booked-title">You&apos;re booked.</h2>
          <p className="lead">
            One message on WhatsApp with everything you need at the gate: where, when, what you paid, and how long you
            have to change your mind.
          </p>
          <ul className="booked__list">
            {BENEFITS.map((b) => (
              <li key={b.title}>
                <b>{b.title}</b>
                <span>{b.body}</span>
              </li>
            ))}
          </ul>
          <p className="booked__sms">No WhatsApp? The same message comes by SMS.</p>
          <Link className="btn btn--accent" href="/venues">
            See open slots
          </Link>
        </div>
      </div>
    </section>
  );
}
