"use client";

import type { Venue } from "@/lib/domain/types";
import { venueWithSettings } from "@/lib/store/queries";
import { useStore } from "@/lib/store/store";
import d from "./dashboard.module.css";

/** The venue's name as the owner last saved it in their profile. */
export function VenueBadge({ venue: listed }: { venue: Venue }) {
  const venue = venueWithSettings(useStore(), listed);
  return (
    <div className={d.venueBox}>
      <p className={d.venueName}>{venue.name}</p>
      <p className={d.venueSub}>
        {venue.area}, {venue.city} · Demo venue
      </p>
    </div>
  );
}
