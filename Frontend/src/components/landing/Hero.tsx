import Link from "next/link";
import { BookingPreview } from "./BookingPreview";

export function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero__grid">
        <div>
          <p className="eyebrow">Launching in Lahore and Karachi</p>
          <h1>
            Book the court, <span>not the call.</span>
          </h1>
          <p className="lead">
            See free slots and prices at padel, futsal, indoor cricket and badminton courts near you. Pay with
            JazzCash, Easypaisa or card, and the confirmation lands on your WhatsApp.
          </p>
          <div className="hero__ctas">
            <Link className="btn btn--accent" href="/venues">
              Find a court
            </Link>
            <a className="btn btn--ghost" href="#venues">
              I own a venue
            </a>
          </div>
          <ul className="hero__facts">
            <li>Refund rules shown before you pay</li>
            <li>No booking fee for players</li>
          </ul>
        </div>
        <BookingPreview />
      </div>
    </section>
  );
}
