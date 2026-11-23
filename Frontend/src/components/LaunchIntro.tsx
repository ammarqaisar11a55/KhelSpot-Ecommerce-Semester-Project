"use client";

// The opening moment, matching the Android app: on Ink, the KHELSP●T logo settles in,
// the Floodlight dot pops with a glow and a ring, a court line draws out under it, the
// tagline rises, then the logo lifts away and the Ink fades to the page beneath.
//
// Pure CSS keyframes (globals.css, .intro), so it starts before any JavaScript runs
// and only animates transform and opacity. Once per browser session: INTRO_SCRIPT
// marks <html data-intro="seen"> before the first paint on later page loads.
// Click to skip; prefers-reduced-motion gets a short fade.

import { useState, type AnimationEvent } from "react";

export const INTRO_KEY = "khelspot:intro";

/** Runs inline before the overlay is parsed. Storage can throw (private mode): then it just plays. */
export const INTRO_SCRIPT = `try{var k=${JSON.stringify(INTRO_KEY)};if(sessionStorage.getItem(k)){document.documentElement.dataset.intro="seen"}else{sessionStorage.setItem(k,"1")}}catch(e){}`;

export function LaunchIntro() {
  const [phase, setPhase] = useState<"on" | "skip" | "done">("on");
  if (phase === "done") return null;

  const end = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.animationName.startsWith("intro-veil")) setPhase("done");
  };

  return (
    <div
      className={phase === "skip" ? "intro intro--skip" : "intro"}
      aria-hidden="true"
      onClick={() => setPhase("skip")}
      onAnimationEnd={end}
    >
      <div className="intro__group">
        <div className="intro__logo">
          <span className="intro__glow" />
          <span className="intro__ring" />
          {/* Same artwork as the app's splash screen. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/splash-logo.png" alt="" width={690} height={208} decoding="sync" fetchPriority="high" />
          <span className="intro__dot" />
        </div>
        {/* Hangs below the logo so the logo itself stays dead centre, as in the app. */}
        <span className="intro__below">
          <span className="intro__line" />
          <span className="intro__tag">Find it. Book it. Play.</span>
        </span>
      </div>
    </div>
  );
}
