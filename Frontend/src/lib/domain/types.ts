export const SPORTS = ["padel", "futsal", "cricket", "badminton"] as const;
export type Sport = (typeof SPORTS)[number];

export const SPORT_LABEL: Record<Sport, string> = {
  padel: "Padel",
  futsal: "Futsal",
  cricket: "Indoor cricket",
  badminton: "Badminton",
};

/** Launch city. Add cities here as KhelSpot expands. */
export const CITIES = ["Lahore"] as const;
export type City = (typeof CITIES)[number];

export const PAYMENT_METHODS = ["jazzcash", "easypaisa", "card", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  card: "Debit or credit card",
  cash: "Pay at venue",
};

/** Calendar date of the operating day, "YYYY-MM-DD" (local time). */
export type ISODate = string;

/**
 * Hours are counted from midnight of the operating day and can run past 24,
 * so a venue open 4 PM to 4 AM has openHour 16 and closeHour 28.
 */
export type Hour = number;

export interface Court {
  id: string;
  name: string;
  sport: Sport;
}

export interface RateBand {
  from: Hour;
  to: Hour;
  price: number; // Rs per hour
  label: string; // "Off-peak", "Peak", "Late"
}

export interface CancellationPolicy {
  /** Full refund when cancelled at least this many hours before start. */
  freeUntilHours: number;
  /** Refund percent when cancelled later than that, before start. */
  lateRefundPercent: number;
}

/** The parts of a venue its owner can change from the dashboard. */
export interface VenueSettings {
  openHour: Hour;
  closeHour: Hour;
  pricing: Partial<Record<Sport, RateBand[]>>;
  cancellation: CancellationPolicy;
  payAtVenue: boolean;
}

/** How the owner describes the venue to players, from the dashboard. */
export interface VenueProfile {
  name: string;
  area: string;
  address: string;
  description: string;
  amenities: string[];
  /** Court names by court id. Sports and court count stay as listed. */
  courtNames: Record<string, string>;
  /** The owner's own photo, or null when they removed the listed one. Absent keeps the listed photo. */
  photo?: { src: string; alt: string } | null;
  /** A Google Maps link to the venue, as the owner pasted it. Empty when none. */
  mapUrl?: string;
}

export interface VenuePhoto {
  src: string;
  alt: string;
  /** Photographer and source, shown as a credit (stock photos until venues upload their own). */
  credit: string;
  creditUrl: string;
}

export interface Venue extends VenueSettings {
  id: string;
  slug: string;
  name: string;
  city: City;
  area: string;
  address: string;
  description: string;
  courts: Court[];
  amenities: string[];
  photo?: VenuePhoto;
  /** A Google Maps link to the venue, when the owner has added one. */
  mapUrl?: string;
}

export type BookingStatus = "confirmed" | "cancelled";
export type BookingSource = "online" | "walk-in";

export interface Customer {
  name: string;
  phone: string;
}

export interface Booking {
  id: string;
  ref: string;
  venueId: string;
  courtId: string;
  date: ISODate;
  start: Hour;
  hours: number;
  price: number;
  customer: Customer;
  payment: PaymentMethod;
  paid: boolean;
  status: BookingStatus;
  source: BookingSource;
  createdAt: string; // ISO timestamp
  cancelledAt?: string;
  refund?: number;
  /** Made by the player on this device (shows under My bookings). */
  mine?: boolean;
  /** Generated sample booking. */
  seeded?: boolean;
}
