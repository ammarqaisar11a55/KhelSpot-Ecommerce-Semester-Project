import Link from "next/link";

// The venue-owner flyer from brand kit v1.0 (A5), adapted for the web: the
// printed QR and short link become a real sign-up button.
const FEATURES = [
  "Instant confirmed bookings",
  "Online payment: JazzCash, Easypaisa, card",
  "Live availability calendar",
  "Automatic WhatsApp & SMS confirmations",
  "Customer records & revenue tracking",
];

export function Venues() {
  return (
    <section id="venues" className="owners" aria-labelledby="owners-title">
      <div className="wrap owners__grid">
        <div className="owners__copy">
          <p className="eyebrow">Why venues switch</p>
          <p className="owners__pitch">
            You&apos;re already paying for ads. KhelSpot turns those clicks into paid bookings, so you don&apos;t have to
            answer every message yourself.
          </p>
          <dl className="owners__facts">
            <div>
              <dt>78%</dt>
              <dd>Cheaper than the PKR 4,500 a month charged for comparable venue software.</dd>
            </div>
            <div>
              <dt>0%</dt>
              <dd>Commission on your bookings, with unlimited courts on one plan.</dd>
            </div>
            <div>
              <dt>1 month</dt>
              <dd>Free to start. No contract, and you can cancel any time.</dd>
            </div>
          </dl>
          <Link className="owners__signin" href="/owners/login">
            Already listed? Sign in to your dashboard
          </Link>
        </div>

        <article className="flyer">
          <header className="flyer__head">
            <p className="flyer__label">For venue owners</p>
            <h2 id="owners-title">Stop taking bookings on WhatsApp.</h2>
          </header>
          <ol className="flyer__list">
            {FEATURES.map((f, i) => (
              <li key={f}>
                <span className="flyer__num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {f}
              </li>
            ))}
          </ol>
          <div className="flyer__price">
            <p className="flyer__amount">
              <span>Rs 999</span> / month
            </p>
            <p className="flyer__free">First month free</p>
          </div>
          <footer className="flyer__foot">
            <div>
              <p className="flyer__cta-line">List your venue in 10 minutes</p>
              <Link className="btn btn--accent" href="/owners/signup">
                Start the free month
              </Link>
            </div>
            <svg className="flyer__mark" viewBox="0 0 64 64" aria-hidden="true">
              <path d="M18 14.5h8v14.2L36.3 14.5h9.2L34.6 29.4 46 49.5h-9.3l-7.8-14.4-2.9 3.9v10.5h-8z" fill="#F3F2EC" />
              <circle cx="47" cy="15.5" r="6" fill="#D4F53C" />
            </svg>
          </footer>
        </article>
      </div>
    </section>
  );
}
