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

async function request<T>(path: string, init?: { method?: "GET" | "POST" | "PUT"; body?: unknown }): Promise<T> {
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
      headers: init?.body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("OFFLINE", `Can't reach the KhelSpot server at ${apiUrl}. Check your connection and try again.`);
  } finally {
    clearTimeout(timer);
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON error page; handled below.
  }
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
  }) => request<{ booking: Booking }>("/bookings", { method: "POST", body: input }).then((r) => r.booking),

  booking: (ref: string, phone: string) =>
    request<{ booking: Booking }>(`/bookings/${encodeURIComponent(ref)}${q({ phone })}`).then((r) => r.booking),

  cancel: (ref: string, phone: string) =>
    request<{ booking: Booking }>(`/bookings/${encodeURIComponent(ref)}/cancel`, { method: "POST", body: { phone } }).then(
      (r) => r.booking,
    ),
};
