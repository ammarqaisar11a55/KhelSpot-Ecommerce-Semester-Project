"use client";

import { DEMO_OWNER_VENUE_ID, getVenueById } from "@/lib/catalog/venues";
import { operatingNow } from "@/lib/domain/time";
import { useBrowserOnly, useNow } from "@/lib/hooks";
import { venueWithSettings } from "@/lib/store/queries";
import { useStore } from "@/lib/store/store";

/** The signed-in owner's venue (demo: fixed), with saved settings applied. */
export function useOwnerVenue() {
  useBrowserOnly();
  const state = useStore();
  const now = useNow();
  const base = getVenueById(DEMO_OWNER_VENUE_ID)!;
  const venue = venueWithSettings(state, base);
  const today = operatingNow(now).date;
  return { state, now, base, venue, today };
}
