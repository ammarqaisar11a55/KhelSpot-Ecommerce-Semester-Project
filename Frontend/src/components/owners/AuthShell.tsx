import Link from "next/link";
import type { ReactNode } from "react";
import { SpotLogo } from "@/components/brand/SpotLogo";
import o from "./owners.module.css";

/** A court seen from above, in the thin white lines of a pitch at night. */
function CourtLines() {
  return (
    <svg className={o.courtLines} viewBox="0 0 400 640" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="40" y="40" width="320" height="560" rx="6" />
        <line x1="40" y1="320" x2="360" y2="320" />
        <circle cx="200" cy="320" r="62" />
        <circle cx="200" cy="320" r="4" fill="currentColor" />
        <path d="M120 40 v70 a80 80 0 0 0 160 0 v-70" />
        <path d="M120 600 v-70 a80 80 0 0 1 160 0 v70" />
        <rect x="165" y="28" width="70" height="12" />
        <rect x="165" y="600" width="70" height="12" />
      </g>
    </svg>
  );
}

/** One booking, the thing a venue owner wants to see more of. */
function SlotTicket() {
  return (
    <div className={o.ticket} aria-hidden="true">
      <span className={o.ticketCourt}>Futsal Pitch 1</span>
      <span className={o.ticketTime}>9 PM to 10 PM</span>
      <span className={o.ticketPaid}>Rs 4,500 paid online</span>
    </div>
  );
}

export function AuthShell({
  title,
  intro,
  aside,
  children,
}: {
  title: string;
  intro: ReactNode;
  /** Extra content under the intro, such as the plan's price. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={o.shell}>
      <section className={o.pitch}>
        <CourtLines />
        <Link className={`brandSpot ${o.brand}`} href="/" aria-label="KhelSpot home">
          <SpotLogo on="dark" size={26} />
        </Link>
        <div className={o.pitchText}>
          <h1 className={o.pitchTitle}>{title}</h1>
          <div className={o.pitchIntro}>{intro}</div>
          {aside}
        </div>
        <div className={o.ticketWrap}>
          <SlotTicket />
          <p className={o.ticketCaption}>A booking made and paid on KhelSpot, before the player arrives.</p>
        </div>
      </section>
      <main className={o.formSide}>
        <div className={o.formInner}>{children}</div>
        <p className={o.demoNote}>Demo build. No text messages are sent and no money is charged.</p>
      </main>
    </div>
  );
}
