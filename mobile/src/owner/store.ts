// Which venue the owner runs, saved on this phone until owner sign-in (phase 3)
// ties the account to its venue on the Server.

import { useSyncExternalStore } from "react";
import { readJson, writeJson } from "@/lib/storage";

let venueSlug: string | null = readJson<{ slug?: string }>("owner")?.slug ?? null;
const listeners = new Set<() => void>();

export function setOwnerVenue(slug: string | null) {
  venueSlug = slug;
  writeJson("owner", slug ? { slug } : {});
  listeners.forEach((l) => l());
}

export function useOwnerVenue(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => venueSlug,
    () => venueSlug,
  );
}
