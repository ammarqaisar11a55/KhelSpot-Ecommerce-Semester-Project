import type { Metadata } from "next";
import Link from "next/link";
import { SpotLogo } from "@/components/brand/SpotLogo";
import { DashNav } from "@/components/dashboard/DashNav";
import { VenueBadge } from "@/components/dashboard/VenueBadge";
import d from "@/components/dashboard/dashboard.module.css";
import { DEMO_OWNER_VENUE_ID, getVenueById } from "@/lib/catalog/venues";

export const metadata: Metadata = {
  title: { default: "Venue dashboard", template: "%s · Venue dashboard · KhelSpot" },
  robots: { index: false },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const venue = getVenueById(DEMO_OWNER_VENUE_ID)!;
  return (
    <div className={d.shell}>
      <aside className={d.side}>
        <Link className="brandSpot" href="/" aria-label="KhelSpot home">
          <SpotLogo on="dark" size={24} />
        </Link>
        <VenueBadge venue={venue} />
        <DashNav />
        <div className={d.sideFoot}>
          <Link href={`/venues/${venue.slug}`}>See your public page</Link>
          <Link href="/venues">Open the player app</Link>
          <Link href="/owners/login">Sign out</Link>
        </div>
      </aside>
      <main className={d.content}>{children}</main>
    </div>
  );
}
