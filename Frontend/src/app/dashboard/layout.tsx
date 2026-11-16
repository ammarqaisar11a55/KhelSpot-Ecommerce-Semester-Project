import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/brand/LogoMark";
import { DashNav } from "@/components/dashboard/DashNav";
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
        <Link className="brand" href="/" aria-label="KhelSpot home">
          <LogoMark size={24} />
          <Wordmark />
        </Link>
        <div className={d.venueBox}>
          <p className={d.venueName}>{venue.name}</p>
          <p className={d.venueSub}>
            {venue.area}, {venue.city} · Demo venue
          </p>
        </div>
        <DashNav />
        <div className={d.sideFoot}>
          <Link href={`/venues/${venue.slug}`}>See your public page</Link>
          <Link href="/venues">Open the player app</Link>
        </div>
      </aside>
      <main className={d.content}>{children}</main>
    </div>
  );
}
