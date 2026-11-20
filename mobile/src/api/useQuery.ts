// Minimal data loading for screens: keyed fetches with refresh, no cache library.

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./client";
import { useConnection } from "./connection";

interface State<T> {
  key: string | null;
  data?: T;
  error?: ApiError;
}

export interface Query<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
}

/** Runs `fn` whenever `key` changes (null = skip) or the server address changes. */
export function useQuery<T>(key: string | null, fn: () => Promise<T>): Query<T> {
  const { apiUrl } = useConnection();
  const fullKey = key === null ? null : `${apiUrl}|${key}`;
  const [state, setState] = useState<State<T>>({ key: null });
  const [nonce, setNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (fullKey === null) return;
    let alive = true;
    fnRef
      .current()
      .then((data) => alive && setState({ key: fullKey, data }))
      .catch(
        (e: unknown) =>
          alive &&
          setState((s) => ({
            key: fullKey,
            data: s.key === fullKey ? s.data : undefined,
            error: e instanceof ApiError ? e : new ApiError("UNKNOWN", "Something went wrong. Try again."),
          })),
      )
      .finally(() => alive && setRefreshing(false));
    return () => {
      alive = false;
    };
  }, [fullKey, nonce]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setNonce((n) => n + 1);
  }, []);

  const current = state.key === fullKey ? state : { key: fullKey };
  return {
    data: current.data,
    error: current.error,
    loading: fullKey !== null && current.data === undefined && current.error === undefined,
    refreshing,
    refresh,
  };
}
