// Data loading for screens, built for a fluid flow:
// - one in-memory cache shared by every screen, so data already loaded on one
//   screen shows instantly on the next (stale-while-revalidate);
// - when a filter or day changes, the previous results stay up until the new
//   ones arrive, instead of flashing a skeleton;
// - screens can prime the cache for the screen the player is about to open;
// - what loaded last is saved on the phone, so with no internet (or on the next
//   launch) screens still show it, then refresh once the server answers again.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSession, subscribeSession } from "@/auth/session";
import { readJson, writeJson } from "@/lib/storage";
import { ApiError } from "./client";
import { getConnection, useConnection } from "./connection";

// Entries are replaced, never mutated, so React (and its compiler) sees every change.
interface Entry {
  data?: unknown;
  error?: ApiError;
  at: number;
  /** When `data` last came from the server (kept through failed refreshes). */
  loadedAt?: number;
  pending?: boolean;
}

const cache = new Map<string, Entry>();

// ---------- saved on the phone ----------

const STORE = "query-cache";
const MAX_SAVED = 80;
/** Owner screens hold customers' names and numbers: kept only while that owner is signed in. */
const isPrivate = (k: string) => k.includes("|owner-");

type Saved = Record<string, { data: unknown; loadedAt: number }>;

// Restored as already stale, so screens show it at once and refresh straight away.
for (const [k, v] of Object.entries(readJson<Saved>(STORE) ?? {})) {
  if (v && v.data !== undefined && (!isPrivate(k) || getSession().token)) cache.set(k, { data: v.data, at: 0, loadedAt: v.loadedAt });
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const rows = [...cache.entries()]
      .filter(([, e]) => e.data !== undefined && e.loadedAt)
      .sort((a, b) => b[1].loadedAt! - a[1].loadedAt!)
      .slice(0, MAX_SAVED);
    writeJson(STORE, Object.fromEntries(rows.map(([k, e]) => [k, { data: e.data, loadedAt: e.loadedAt! }])));
  }, 400);
}

// Signing out, or another account signing in, drops the previous owner's data.
let sessionToken = getSession().token;
subscribeSession(() => {
  const token = getSession().token;
  if (token === sessionToken) return;
  sessionToken = token;
  let dropped = false;
  for (const k of [...cache.keys()]) {
    if (isPrivate(k)) {
      cache.delete(k);
      dropped = true;
    }
  }
  if (dropped) {
    persist();
    notify();
  }
});
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** How long cached data counts as fresh; older data still shows, then refreshes. */
const FRESH_MS = 20_000;

const fullKey = (apiUrl: string | null, key: string) => `${apiUrl}|${key}`;

/** Put data in the cache ahead of time, e.g. a venue already loaded in a list. */
export function primeQuery<T>(key: string, data: T) {
  const k = fullKey(getConnection().apiUrl, key);
  const cur = cache.get(k);
  if (!cur?.data && !cur?.pending) {
    cache.set(k, { data, at: Date.now() });
    notify();
  }
}

/** Mark everything stale so open screens fetch again, e.g. after coming back online. */
export function retryAllQueries() {
  for (const [k, e] of cache) if (!e.pending) cache.set(k, { ...e, at: 0, error: undefined });
  notify();
}

/** Drop cached data so the next screen that needs it fetches again (after a change). */
export function invalidateQueries(prefix: string) {
  const base = fullKey(getConnection().apiUrl, prefix);
  for (const [k, e] of cache) if (k.startsWith(base)) cache.set(k, { ...e, at: 0 });
  notify();
}

function run<T>(k: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(k);
  if (existing) return existing as Promise<T>;
  cache.set(k, { ...(cache.get(k) ?? { at: 0 }), pending: true });
  notify();
  const p = fn()
    .then((data) => {
      const now = Date.now();
      cache.set(k, { data, at: now, loadedAt: now });
      persist();
      return data;
    })
    .catch((e: unknown) => {
      const error = e instanceof ApiError ? e : new ApiError("UNKNOWN", "Something went wrong. Try again.");
      const prev = cache.get(k);
      cache.set(k, { data: prev?.data, loadedAt: prev?.loadedAt, error, at: Date.now() });
      throw error;
    })
    .finally(() => {
      inflight.delete(k);
      notify();
    });
  inflight.set(k, p);
  return p;
}

export interface Query<T> {
  data: T | undefined;
  error: ApiError | undefined;
  /** Nothing to show yet: render a skeleton. */
  loading: boolean;
  /** Showing previous or cached data while newer data loads. */
  updating: boolean;
  /** Showing saved data because the latest refresh failed; when it was loaded. */
  staleSince: number | undefined;
  refreshing: boolean;
  refresh: () => void;
}

/** Runs `fn` for `key` (null = skip). Re-runs when the key or the server address changes. */
export function useQuery<T>(key: string | null, fn: () => Promise<T>): Query<T> {
  const { apiUrl } = useConnection();
  const k = key === null ? null : fullKey(apiUrl, key);
  const read = () => (k === null ? undefined : cache.get(k));
  const entry = useSyncExternalStore(subscribe, read, read);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const [refreshing, setRefreshing] = useState(false);
  // Last data this screen showed, kept while a new key loads
  // (React's "store information from previous renders" pattern).
  const [shown, setShown] = useState<T | undefined>(undefined);

  // Marked stale by a change elsewhere (a booking, a cancel): refresh while open.
  const invalidated = !!entry && entry.at === 0 && !entry.pending;
  useEffect(() => {
    if (k === null) return;
    const e = cache.get(k);
    if (!e || (!e.pending && Date.now() - e.at > FRESH_MS)) void run(k, () => fnRef.current()).catch(() => {});
  }, [k, invalidated]);

  const refresh = useCallback(() => {
    if (k === null) return;
    setRefreshing(true);
    void run(k, () => fnRef.current())
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [k]);

  const data = entry?.data as T | undefined;
  if (data !== undefined && data !== shown) setShown(data);
  const busy = !!entry?.pending;
  const visible = data ?? (busy ? shown : undefined);
  return {
    data: visible,
    error: data === undefined && !busy ? entry?.error : undefined,
    loading: k !== null && visible === undefined && !entry?.error,
    updating: busy && visible !== undefined,
    staleSince: data !== undefined && entry?.error ? entry.loadedAt : undefined,
    refreshing,
    refresh,
  };
}
