// What the player app keeps on this phone until accounts exist (phase 3):
// the name and number used to book, and the references of bookings made here.
// The Server holds the bookings themselves; a booking is read back with ref + phone.

import { useSyncExternalStore } from "react";
import type { Customer } from "@shared/domain/types";
import { readJson, writeJson } from "@/lib/storage";

export interface SavedBooking {
  ref: string;
  phone: string;
  venueSlug: string;
  addedAt: string;
}

interface PlayerState {
  profile: Customer | null;
  /** WhatsApp booking updates: only sent with this tick (needed before any template is sent). */
  whatsappOk: boolean;
  /** "Game in 2 hours" notifications; on unless the player turns them off in Account. */
  remindersOn: boolean;
  bookings: SavedBooking[];
}

const KEY = "player";
const EMPTY: PlayerState = { profile: null, whatsappOk: false, remindersOn: true, bookings: [] };

let state: PlayerState = { ...EMPTY, ...(readJson<Partial<PlayerState>>(KEY) ?? {}) };
const listeners = new Set<() => void>();

function set(next: PlayerState) {
  state = next;
  writeJson(KEY, state);
  listeners.forEach((l) => l());
}

export function usePlayer(): PlayerState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function rememberBooking(b: SavedBooking, profile: Customer, whatsappOk: boolean) {
  set({
    ...state,
    profile,
    whatsappOk,
    bookings: [b, ...state.bookings.filter((x) => x.ref !== b.ref)].slice(0, 100),
  });
}

export function setRemindersOn(on: boolean) {
  set({ ...state, remindersOn: on });
}

export const remindersEnabled = () => state.remindersOn;

export function forgetBooking(ref: string) {
  set({ ...state, bookings: state.bookings.filter((b) => b.ref !== ref) });
}

export function findSavedBooking(ref: string): SavedBooking | undefined {
  return state.bookings.find((b) => b.ref === ref);
}
