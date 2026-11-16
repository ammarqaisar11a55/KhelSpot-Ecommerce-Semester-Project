"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";

const LINKS = [
  { href: "/venues", label: "Find courts" },
  { href: "#how", label: "How it works" },
  { href: "#sports", label: "Sports" },
  { href: "#venues", label: "For venues" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="nav">
      <div className="wrap nav__inner">
        <a className="brand" href="#top" aria-label="KhelSpot home">
          <LogoMark />
          <Wordmark />
        </a>
        <button
          className="nav__toggle"
          type="button"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <nav id="nav-links" className={`nav__links${open ? " is-open" : ""}`}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={close}>
              {l.label}
            </a>
          ))}
          <Link className="btn btn--small btn--accent" href="/venues" onClick={close}>
            Book a court
          </Link>
        </nav>
      </div>
    </header>
  );
}
