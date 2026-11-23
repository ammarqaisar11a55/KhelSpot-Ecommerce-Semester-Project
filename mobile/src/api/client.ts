// Typed client for the KhelSpot Server (see Server/README.md for the routes).

import type {
  Booking,
  Customer,
  Hour,
  ISODate,
  PaymentMethod,
  Sport,
  Venue,
} from "@shared/domain/types";
import { getToken, signedOut, type User } from "@/auth/session";
import { useSyncExternalStore } from "react";
import { getConnection } from "./connection";

export type SlotStatus = "free" | "booked" | "past" | "no-rate";

export interface Slot {
  hour: Hour;
  status: SlotStatus;
  price?: number;
  band?: string;
}

export interface CourtAvailability {
  courtId: string;
  name: string;
  sport: Sport;
  slots: Slot[];
}

export interface Availability {
  venueId: string;
  date: ISODate;
  courts: CourtAvailability[];
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 12_000;

// ---------- reachability ----------
// false after a request couldn't reach the server (no internet, server down); true again
// after any answer. Screens keep showing saved data meanwhile (see useQuery).
let reachable = true;
const reachListeners = new Set<() => void>();
function setReachable(v: boolean) {
  if (reachable === v) return;
  reachable = v;
  reachListeners.forEach((l) => l());
}
export function useReachable(): boolean {
  return useSyncExternalStore(
    (l) => {
      reachListeners.add(l);
      return () => reachListeners.delete(l);
    },
    () => reachable,
    () => reachable,
  );
}

type Method = "GET" | "POST" | "PUT" | "PATCH";

async function request<T>(path: string, init?: { method?: Method; body?: unknown }): Promise<T> {
  const { apiUrl } = getConnection();
  if (!apiUrl) {
    throw new ApiError("NOT_CONFIGURED", "This build doesn't know where the KhelSpot server is. Set it in Account › Server connection.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${apiUrl}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : null),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : null),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    setReachable(false);
    throw new ApiError("OFFLINE", `Can't reach the KhelSpot server at ${apiUrl}. Check your connection and try again.`);
  } finally {
    clearTimeout(timer);
  }
  setReachable(true);
  if (res.status === 204) return null as T;
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON error page; handled below.
  }
  if (res.status === 401 && getToken()) signedOut(); // session expired or revoked
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(err?.code ?? "HTTP_ERROR", err?.message ?? `The server answered ${res.status}.`, res.status);
  }
  return json as T;
}

const q = (params: Record<string, string | undefined>) => {
  const s = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");
  return s ? `?${s}` : "";
};

// ---------- players ----------

export const api = {
  venues: (filter: { sport?: Sport; area?: string } = {}) =>
    request<{ venues: Venue[] }>(`/venues${q({ sport: filter.sport, area: filter.area })}`).then((r) => r.venues),

  venue: (slug: string) => request<{ venue: Venue }>(`/venues/${encodeURIComponent(slug)}`).then((r) => r.venue),

  availability: (slug: string, date?: ISODate) =>
    request<Availability>(`/venues/${encodeURIComponent(slug)}/availability${q({ date })}`),

  book: (input: {
    venueId: string;
    courtId: string;
    date: ISODate;
    start: Hour;
    hours: number;
    customer: Customer;
    payment: PaymentMethod;
    returnUrl?: string;
  }) => request<{ booking: Booking; checkout?: { url: string } }>("/bookings", { method: "POST", body: input }),

  booking: (ref: string, phone: string) =>
    request<{ booking: Booking }>(`/bookings/${encodeURIComponent(ref)}${q({ phone })}`).then((r) => r.booking),

  cancel: (ref: string, phone: string) =>
    request<{ booking: Booking }>(`/bookings/${encodeURIComponent(ref)}/cancel`, { method: "POST", body: { phone } }).then(
      (r) => r.booking,
    ),
};

// ---------- sign-in (phone OTP) ----------

export const auth = {
  /** Sends the code. `devCode` comes back from a local or demo Server (OTP_DEV_ECHO), which sends no SMS. */
  requestCode: (phone: string) =>
    request<{ devCode?: string } | null>("/auth/otp", { method: "POST", body: { phone } }).then((r) => r ?? {}),
  verify: (phone: string, code: string) =>
    request<{ token: string; user: User }>("/auth/verify", { method: "POST", body: { phone, code } }),
  me: () => request<{ user: User }>("/me").then((r) => r.user),
  setName: (name: string) => request<{ user: User }>("/me", { method: "PATCH", body: { name } }).then((r) => r.user),
  logout: () => request<null>("/auth/logout", { method: "POST" }),
  myBookings: () =>
    request<{ bookings: (Booking & { venue: { id: string; slug: string; name: string; area: string } })[] }>("/me/bookings").then(
      (r) => r.bookings,
    ),
};

// ---------- venue owners (signed in, own venue only) ----------

export interface CustomerSummary {
  name: string;
  phone: string;
  games: number;
  hours: number;
  spent: number;
  lastVisit: ISODate | null;
  nextVisit: ISODate | null;
}

export type VenueSettingsInput = Pick<Venue, "openHour" | "closeHour" | "pricing" | "cancellation" | "payAtVenue">;

export const owner = {
  venue: (id: string) => request<{ venue: Venue }>(`/owner/venues/${id}`).then((r) => r.venue),
  bookings: (id: string, from: ISODate, to: ISODate) =>
    request<{ bookings: Booking[] }>(`/owner/venues/${id}/bookings${q({ from, to })}`).then((r) => r.bookings),
  customers: (id: string) => request<{ customers: CustomerSummary[] }>(`/owner/venues/${id}/customers`).then((r) => r.customers),
  saveSettings: (id: string, settings: VenueSettingsInput) =>
    request<{ venue: Venue }>(`/owner/venues/${id}/settings`, { method: "PUT", body: settings }).then((r) => r.venue),
  walkIn: (input: {
    venueId: string;
    courtId: string;
    date: ISODate;
    start: Hour;
    hours: number;
    customer: Customer;
    payment: PaymentMethod;
    paid?: boolean;
  }) => request<{ booking: Booking }>("/owner/bookings", { method: "POST", body: input }).then((r) => r.booking),
  booking: (ref: string) => request<{ booking: Booking }>(`/owner/bookings/${ref}`).then((r) => r.booking),
  markPaid: (ref: string) => request<{ booking: Booking }>(`/owner/bookings/${ref}/mark-paid`, { method: "POST" }).then((r) => r.booking),
  cancel: (ref: string) => request<{ booking: Booking }>(`/owner/bookings/${ref}/cancel`, { method: "POST" }).then((r) => r.booking),
};
