import type { Hour, ISODate } from "./types";

/** Before this hour, the clock still belongs to the previous operating day (night sessions). */
export const DAY_START_HOUR = 6;

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** The current operating day and hour (fractional), e.g. 1:30 AM Saturday is Friday hour 25.5. */
export function operatingNow(now: Date = new Date()): { date: ISODate; hour: number } {
  const hour = now.getHours() + now.getMinutes() / 60;
  if (now.getHours() < DAY_START_HOUR) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return { date: toISODate(prev), hour: hour + 24 };
  }
  return { date: toISODate(now), hour };
}

/** Real start time of an operating-day hour. */
export function slotStart(date: ISODate, hour: Hour): Date {
  const d = parseISODate(date);
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + hour * 3_600_000);
}

export function hoursUntil(date: ISODate, hour: Hour, now: Date = new Date()): number {
  return (slotStart(date, hour).getTime() - now.getTime()) / 3_600_000;
}

export function isPast(date: ISODate, hour: Hour, now: Date = new Date()): boolean {
  return hoursUntil(date, hour, now) <= 0;
}

/** 21 -> "9 PM", 24 -> "12 AM", 25.5 -> "1:30 AM" */
export function formatHour(h: Hour): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  const h24 = whole % 24;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return mins ? `${h12}:${pad(mins)} ${suffix}` : `${h12} ${suffix}`;
}

/** 21 -> "9:00 PM" */
export function formatHourLong(h: Hour): string {
  const s = formatHour(h);
  return s.includes(":") ? s : s.replace(" ", ":00 ");
}

export function formatRange(start: Hour, hours: number): string {
  return `${formatHourLong(start)} – ${formatHourLong(start + hours)}`;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function weekdayShort(s: ISODate): string {
  return WEEKDAY[parseISODate(s).getDay()];
}

export function dayOfMonth(s: ISODate): number {
  return parseISODate(s).getDate();
}

/** "Fri 15 Nov" */
export function formatDay(s: ISODate): string {
  const d = parseISODate(s);
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
}

/** "Today", "Tomorrow" or "Fri 15 Nov" */
export function relativeDay(s: ISODate, today: ISODate): string {
  const diff = daysBetween(today, s);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDay(s);
}

/** Calendar date a slot really happens on (hour 25 of Monday is Tuesday 1 AM). */
export function realDate(date: ISODate, hour: Hour): ISODate {
  return hour >= 24 ? addDays(date, Math.floor(hour / 24)) : date;
}

/**
 * Day and time as the player experiences it, e.g. "Tue 17 Nov, 1:00 AM – 3:00 AM"
 * for hours 25–27 of Monday. Use this anywhere a booking's time is shown.
 */
export function formatWhen(date: ISODate, start: Hour, hours: number): string {
  return `${formatDay(realDate(date, start))}, ${formatRange(start, hours)}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDay(toISODate(d))}, ${formatHour(d.getHours() + d.getMinutes() / 60)}`;
}
