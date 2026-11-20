// Sample data for the landing-page booking preview. Not real venue data.
// Rates follow the time-band pricing seen in venue ads (proposal, Section C).

export const DAYS = [
  { key: "Thu", date: 14 },
  { key: "Fri", date: 15 },
  { key: "Sat", date: 16 },
  { key: "Sun", date: 17 },
] as const;

export type DayKey = (typeof DAYS)[number]["key"];

export const SLOTS = [
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
  "10 PM",
  "11 PM",
  "12 AM",
  "1 AM",
  "2 AM",
  "3 AM",
] as const;

export type Slot = (typeof SLOTS)[number];

export const BOOKED: Record<DayKey, readonly Slot[]> = {
  Thu: ["7 PM", "8 PM", "11 PM"],
  Fri: ["6 PM", "7 PM", "8 PM", "10 PM", "12 AM"],
  Sat: ["5 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM"],
  Sun: ["4 PM", "8 PM", "9 PM"],
};

const OFF_PEAK: readonly Slot[] = ["4 PM", "5 PM", "6 PM"];
const LATE: readonly Slot[] = ["2 AM", "3 AM"];

export const PEAK_RATE = 6000;

/** Off-peak 4–7 PM Rs 4,000, peak 7 PM–2 AM Rs 6,000, late 2–4 AM Rs 5,000. */
export function rateFor(slot: Slot): number {
  if (OFF_PEAK.includes(slot)) return 4000;
  if (LATE.includes(slot)) return 5000;
  return PEAK_RATE;
}

/** "9 PM" -> "9:00 PM" */
export function longTime(slot: Slot): string {
  return slot.replace(" ", ":00 ");
}

/** Free-cancellation deadline as a clock time: "9 PM" -> "3:00 PM" (6 hours before). */
export function cancelBy(slot: Slot, hoursBefore = 6): string {
  const [h, ap] = slot.split(" ");
  const h24 = (Number(h) % 12) + (ap === "PM" ? 12 : 0);
  const d = (h24 - hoursBefore + 24) % 24;
  return `${d % 12 === 0 ? 12 : d % 12}:00 ${d < 12 ? "AM" : "PM"}`;
}

export function formatRupees(amount: number): string {
  return `Rs ${amount.toLocaleString("en-PK")}`;
}
