"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { cx } from "@/lib/format";
import d from "./dashboard.module.css";

const LINKS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" />,
  },
  {
    href: "/dashboard/calendar",
    label: "Calendar",
    icon: <path d="M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" />,
  },
  {
    href: "/dashboard/bookings",
    label: "Bookings",
    icon: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
    icon: <path d="M16 20v-2a4 4 0 0 0-8 0v2M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M20 20v-1.5a3 3 0 0 0-2.5-3M4 20v-1.5a3 3 0 0 1 2.5-3" />,
  },
  {
    href: "/dashboard/settings",
    label: "Prices and rules",
    icon: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />,
  },
];

function Links({ pathname }: { pathname: string | null }) {
  return (
    <nav className={d.sideNav} aria-label="Dashboard">
      {LINKS.map((l) => {
        const on = pathname === l.href;
        return (
          <Link key={l.href} href={l.href} className={cx(d.sideLink, on && d.sideLinkOn)} aria-current={on ? "page" : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {l.icon}
            </svg>
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

export function DashNav() {
  return (
    <Suspense fallback={<Links pathname={null} />}>
      <ActiveLinks />
    </Suspense>
  );
}
