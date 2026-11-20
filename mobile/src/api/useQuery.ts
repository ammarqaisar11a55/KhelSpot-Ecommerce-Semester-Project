// Data loading for screens, built for a fluid flow:
// - one in-memory cache shared by every screen, so data already loaded on one
//   screen shows instantly on the next (stale-while-revalidate);
// - when a filter or day changes, the previous results stay up until the new
//   ones arrive, instead of flashing a skeleton;
// - screens can prime the cache for the screen the player is about to open.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ApiError } from "./client";
import { getConnection, useConnection } from "./connection";

// Entries are replaced, never mutated, so React (and its compiler) sees every change.
interface Entry {
  data?: unknown;
  error?: ApiError;
  at: number;
  pending?: boolean;
}

const cache = new Map<string, Entry>();
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
      cache.set(k, { data, at: Date.now() });
      return data;
    })
    .catch((e: unknown) => {
      const error = e instanceof ApiError ? e : new ApiError("UNKNOWN", "Something went wrong. Try again.");
      cache.set(k, { data: cache.get(k)?.data, error, at: Date.now() });
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
    refreshing,
    refresh,
  };
}
