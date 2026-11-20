// Where the app finds the KhelSpot Server (API) and the website (venue photos).
//
// Order: the address saved in Account › Server connection, then the build's
// EXPO_PUBLIC_API_URL / EXPO_PUBLIC_WEB_URL, then (in development) the computer
// running Metro on port 4000 / 3000. Until the Server is deployed, internal builds
// point at your laptop's Wi-Fi address from Account › Server connection.

import Constants from "expo-constants";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { readJson, writeJson } from "@/lib/storage";

export interface Connection {
  apiUrl: string | null;
  webUrl: string | null;
  /** Where apiUrl came from, shown on the connection screen. */
  source: "saved" | "build" | "dev" | "none";
}

interface Saved {
  apiUrl?: string;
  webUrl?: string;
}

const KEY = "connection";
const trim = (u?: string | null) => (u ? u.trim().replace(/\/+$/, "") : "") || null;

function devHost(): string | null {
  if (!__DEV__) return null;
  if (Platform.OS === "web") return typeof window !== "undefined" ? window.location.hostname : "localhost";
  // "192.168.1.20:8081" while Metro serves the app.
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri ? hostUri.split(":")[0] : null;
}

function resolve(saved: Saved | null): Connection {
  const buildApi = trim(process.env.EXPO_PUBLIC_API_URL);
  const buildWeb = trim(process.env.EXPO_PUBLIC_WEB_URL);
  const host = devHost();
  const apiUrl = trim(saved?.apiUrl) ?? buildApi ?? (host ? `http://${host}:4000` : null);
  const webUrl =
    trim(saved?.webUrl) ??
    buildWeb ??
    // Same machine as the API, on the web app's dev port.
    (apiUrl ? apiUrl.replace(/:4000$/, ":3000") : null);
  const source = trim(saved?.apiUrl) ? "saved" : buildApi ? "build" : host ? "dev" : "none";
  return { apiUrl, webUrl, source };
}

let current = resolve(readJson<Saved>(KEY));
const listeners = new Set<() => void>();

export function getConnection(): Connection {
  return current;
}

export function saveConnection(next: Saved) {
  const clean: Saved = {};
  if (trim(next.apiUrl)) clean.apiUrl = trim(next.apiUrl)!;
  if (trim(next.webUrl)) clean.webUrl = trim(next.webUrl)!;
  writeJson(KEY, clean);
  current = resolve(clean);
  listeners.forEach((l) => l());
}

export function savedConnection(): Saved {
  return readJson<Saved>(KEY) ?? {};
}

export function useConnection(): Connection {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}

/** Venue photos are stored as site paths ("/venues/x.jpg") until owners upload to storage. */
export function photoUrl(src: string | undefined, conn: Connection = current): string | null {
  if (!src) return null;
  if (/^(https?:|data:)/.test(src)) return src;
  return conn.webUrl ? `${conn.webUrl}${src.startsWith("/") ? "" : "/"}${src}` : null;
}
