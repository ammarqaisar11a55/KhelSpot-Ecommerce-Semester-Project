// Signed-in user and session token. The token lives in the phone's secure storage
// (Android Keystore / iOS Keychain); on web, in localStorage for local testing only.

import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

export interface User {
  phone: string;
  name: string | null;
  ownerOf: { venueId: string; slug: string; name: string }[];
}

interface State {
  token: string | null;
  user: User | null;
}

const TOKEN_KEY = "khelspot.session";
const USER_KEY = "khelspot.user";

function read(key: string): string | null {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (Platform.OS === "web") {
      if (value === null) globalThis.localStorage?.removeItem(key);
      else globalThis.localStorage?.setItem(key, value);
      return;
    }
    if (value === null) void SecureStore.deleteItemAsync(key);
    else SecureStore.setItem(key, value);
  } catch {
    // Without storage the user simply signs in again next time.
  }
}

function load(): State {
  const token = read(TOKEN_KEY);
  let user: User | null = null;
  try {
    const raw = read(USER_KEY);
    user = raw ? (JSON.parse(raw) as User) : null;
  } catch {
    user = null;
  }
  return token ? { token, user } : { token: null, user: null };
}

let state: State = load();
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  write(TOKEN_KEY, next.token);
  write(USER_KEY, next.user ? JSON.stringify(next.user) : null);
  listeners.forEach((l) => l());
}

export const getToken = () => state.token;

export function signedIn(token: string, user: User) {
  set({ token, user });
}

export function updateUser(user: User) {
  if (state.token) set({ ...state, user });
}

export function signedOut() {
  set({ token: null, user: null });
}

/** Runs `l` after every sign-in, sign-out or user update. Returns an unsubscribe. */
export function subscribeSession(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const getSession = (): State => state;

export function useSession(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
