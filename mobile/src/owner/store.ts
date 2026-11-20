// The venue an owner is managing. It comes from sign-in: the Server links the
// owner's phone number to their venue(s). With several, the choice is saved here.

import { useSyncExternalStore } from "react";
import { useSession } from "@/auth/session";
import { readJson, writeJson } from "@/lib/storage";

export interface OwnedVenue {
  venueId: string;
  slug: string;
  name: string;
}

let chosen: string | null = readJson<{ venueId?: string }>("owner")?.venueId ?? null;
const listeners = new Set<() => void>();

export function chooseOwnerVenue(venueId: string) {
  chosen = venueId;
  writeJson("owner", { venueId });
  listeners.forEach((l) => l());
}

/** null when not signed in, or signed in with a number that owns no venue. */
export function useOwnerVenue(): OwnedVenue | null {
  const { user } = useSession();
  const pick = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => chosen,
    () => chosen,
  );
  const owned = user?.ownerOf ?? [];
  return owned.find((v) => v.venueId === pick) ?? owned[0] ?? null;
}
