import Link from "next/link";
import { OwnerCta } from "./OwnerCta";

const FEATURES = [
  "Instant confirmed bookings",
  "Online payment: JazzCash, Easypaisa, card",
  "Live availability calendar",
  "Automatic WhatsApp and SMS confirmations",
  "Customer records and revenue tracking",
  "Peak and off-peak pricing by time slot",
];

export function Venues() {
  return (
    <section id="venues" className="venues">
      <div className="wrap venues__grid">
        <div>
          <p className="eyebrow">For venue owners</p>
          <h2>Stop taking bookings on WhatsApp.</h2>
          <p className="lead">
            You&apos;re already paying for ads. KhelSpot turns those clicks into paid bookings, so you don&apos;t
            have to answer every message yourself.
          </p>
          <ul className="ticks">
            {FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p style={{ marginTop: 24 }}>
            <Link className="btn btn--ghost" href="/dashboard">
              Try the venue dashboard
            </Link>
          </p>
        </div>
        <div className="price">
          <p className="price__name">Venue plan</p>
          <p className="price__amount">
            <span>Rs 999</span> / month
          </p>
          <p className="price__trial">First month free. Cancel any time.</p>
          <p className="price__compare">
            About 78% less than the PKR 4,500 a month charged for comparable venue software.
          </p>
          <OwnerCta />
          <p className="price__small">Unlimited courts and bookings. No commission on bookings.</p>
        </div>
      </div>
    </section>
  );
}
