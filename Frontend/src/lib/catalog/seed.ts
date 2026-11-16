// Deterministic sample bookings, so every venue looks busy in a believable way
// and the same date always shows the same bookings. Nothing here is stored.

import { priceFor, rateAt } from "@/lib/domain/pricing";
import { addDays, isPast, parseISODate, slotStart } from "@/lib/domain/time";
import type { Booking, Customer, ISODate, PaymentMethod, Venue } from "@/lib/domain/types";

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Ali", "Hamza", "Usman", "Bilal", "Fahad", "Saad", "Zain", "Hassan", "Omer", "Danish", "Ahmed", "Talha",
  "Areeb", "Shahzaib", "Moiz", "Haris", "Waleed", "Rayyan", "Sameer", "Taimoor", "Ayesha", "Fatima", "Hira",
  "Mahnoor", "Sana", "Zoya", "Abdullah", "Junaid", "Kashif", "Faizan", "Asad", "Noman", "Umer", "Hammad",
  "Saim", "Arsalan",
];
const LAST = [
  "Raza", "Tariq", "Khalid", "Ahmed", "Iqbal", "Malik", "Abbas", "Javed", "Farooq", "Butt", "Sheikh",
  "Qureshi", "Hussain", "Siddiqui", "Nadeem", "Akhtar", "Mirza", "Khan", "Aslam", "Noor", "Saleem", "Asif",
  "Rehman", "Imran", "Shah", "Anwar", "Mehmood", "Haider", "Rauf", "Ijaz", "Shafiq", "Zafar", "Chaudhry", "Baig",
];

/** Fake numbers in the 0300-0349 range, derived from the name, only for the demo. */
function sampleCustomer(name: string): Customer {
  const h = hash(name);
  const prefix = 300 + (h % 50);
  const rest = String(1000000 + (h % 9000000)).slice(-7);
  return { name, phone: `0${prefix}${rest}` };
}

function randomName(r: () => number): string {
  return `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
}

/** Each venue has about a dozen regulars; everyone else comes now and then. */
function regularsFor(venueId: string): Customer[] {
  const r = rng(hash(`regulars|${venueId}`));
  return Array.from({ length: 12 }, () => sampleCustomer(randomName(r)));
}

function pickCustomer(venueId: string, r: () => number): Customer {
  if (r() < 0.15) {
    const regulars = regularsFor(venueId);
    return regulars[Math.floor(r() * regulars.length)];
  }
  return sampleCustomer(randomName(r));
}

const PAYMENTS: [PaymentMethod, number][] = [
  ["jazzcash", 0.4],
  ["easypaisa", 0.3],
  ["card", 0.15],
  ["cash", 0.15],
];

function pickPayment(r: number): PaymentMethod {
  let acc = 0;
  for (const [m, p] of PAYMENTS) {
    acc += p;
    if (r < acc) return m;
  }
  return "jazzcash";
}

function occupancy(label: string, weekend: boolean): number {
  const base = label === "Peak" || label === "Evening" ? 0.55 : label === "Late" ? 0.2 : 0.25;
  return Math.min(0.85, base + (weekend ? 0.15 : 0));
}

const cache = new Map<string, Booking[]>();

export function seedBookings(venue: Venue, date: ISODate, now: Date = new Date()): Booking[] {
  const key = `${venue.id}:${date}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const dow = parseISODate(date).getDay();
  const weekend = dow === 5 || dow === 6 || dow === 0;
  const out: Booking[] = [];

  for (const court of venue.courts) {
    // Seeds use the venue's original rates, so later price edits don't rewrite history.
    const bands = venue.pricing[court.sport];
    const r = rng(hash(`${court.id}|${date}`));
    let h = venue.openHour;
    while (h < venue.closeHour) {
      const band = rateAt(bands, h);
      if (band && r() < occupancy(band.label, weekend)) {
        const hours = r() < 0.3 && h + 2 <= venue.closeHour ? 2 : 1;
        const price = priceFor(bands, h, hours) ?? band.price * hours;
        const customer = pickCustomer(venue.id, r);
        const payment = pickPayment(r());
        const leadDays = 1 + Math.floor(r() * 5);
        const created = slotStart(addDays(date, -leadDays), 12 + Math.floor(r() * 10));
        const ref = `KS-${hash(`${court.id}${date}${h}`).toString(36).toUpperCase().slice(0, 5).padEnd(5, "0")}`;
        out.push({
          id: `seed:${court.id}:${date}:${h}`,
          ref,
          venueId: venue.id,
          courtId: court.id,
          date,
          start: h,
          hours,
          price,
          customer,
          payment,
          paid: payment !== "cash" || isPast(date, h + hours, now),
          status: "confirmed",
          source: payment === "cash" ? "walk-in" : "online",
          createdAt: created.toISOString(),
          seeded: true,
        });
        h += hours;
      } else {
        h += 1;
      }
    }
  }

  cache.set(key, out);
  return out;
}
