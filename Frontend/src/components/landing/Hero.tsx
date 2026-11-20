import Link from "next/link";
import { BookingPreview } from "./BookingPreview";

export function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero__grid">
        <div>
          <p className="eyebrow">Aaj raat khelna hai? Now booking in Lahore</p>
          <h1>
            Find it. Book it. <span>Play.</span>
          </h1>
          <p className="lead">
            Padel, futsal, indoor cricket and badminton courts across Lahore. See every open slot and its price,
            pay with JazzCash, Easypaisa or card, and you&apos;re booked. Confirmation on WhatsApp in a minute.
          </p>
          <div className="hero__ctas">
            <Link className="btn btn--accent" href="/venues">
              See open slots
            </Link>
            <a className="btn btn--ghost" href="#venues">
              List your venue
            </a>
          </div>
          <ul className="hero__facts">
            <li>Free-cancellation deadline shown before you pay</li>
            <li>No booking fee for players</li>
          </ul>
        </div>
        <BookingPreview />
      </div>
    </section>
  );
}
