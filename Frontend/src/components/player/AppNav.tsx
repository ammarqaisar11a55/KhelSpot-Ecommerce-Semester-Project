"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cx } from "@/lib/format";
import s from "./player.module.css";

const LINKS = [
  { href: "/venues", label: "Find courts" },
  { href: "/bookings", label: "My bookings" },
  { href: "/owners/login", label: "For venue owners" },
];

function Links({ pathname }: { pathname: string | null }) {
  return (
    <nav className={s.nav} aria-label="Main">
      {LINKS.map((l) => {
        const on = !!pathname && (pathname === l.href || pathname.startsWith(`${l.href}/`));
        return (
          <Link key={l.href} href={l.href} className={cx(s.navLink, on && s.navLinkOn)} aria-current={on ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveLinks() {
  return <Links pathname={usePathname()} />;
}

/** The links are in the static shell; the active highlight fills in once the URL is known. */
export function AppNav() {
  return (
    <Suspense fallback={<Links pathname={null} />}>
      <ActiveLinks />
    </Suspense>
  );
}
