import type { z } from "zod";
import type { DB } from "../db.ts";
import { formatHour } from "../domain/time.ts";
import { SPORT_LABEL, type Sport, type Venue, type VenueSettings } from "../domain/types.ts";
import { badRequest, notFound } from "../http/errors.ts";
import type { venueSettings } from "../http/schemas.ts";
import { toVenue, venueInclude } from "./mappers.ts";

export interface VenueFilters {
  city?: string;
  area?: string;
  sport?: Sport;
}

export async function listVenues(db: DB, f: VenueFilters): Promise<Venue[]> {
  const rows = await db.venue.findMany({
    where: {
      ...(f.city ? { city: { equals: f.city, mode: "insensitive" } } : {}),
      ...(f.area ? { area: { equals: f.area, mode: "insensitive" } } : {}),
      ...(f.sport ? { courts: { some: { sport: f.sport } } } : {}),
    },
    include: venueInclude,
    orderBy: { name: "asc" },
  });
  return rows.map(toVenue);
}

export async function getVenueBySlug(db: DB, slug: string): Promise<Venue> {
  const row = await db.venue.findUnique({ where: { slug }, include: venueInclude });
  if (!row) throw notFound("Venue");
  return toVenue(row);
}

export async function getVenueById(db: DB, id: string): Promise<Venue> {
  const row = await db.venue.findUnique({ where: { id }, include: venueInclude });
  if (!row) throw notFound("Venue");
  return toVenue(row);
}

/** Same checks as the dashboard's Prices and rules page. */
export function settingsProblems(s: VenueSettings, sports: Sport[]): string[] {
  const problems: string[] = [];
  if (s.closeHour <= s.openHour) problems.push("Closing time must be after opening time.");
  for (const sport of sports) {
    const bands = [...(s.pricing[sport] ?? [])].sort((a, b) => a.from - b.from);
    const name = SPORT_LABEL[sport];
    if (!bands.length) problems.push(`${name} needs at least one rate.`);
    bands.forEach((b, i) => {
      if (b.to <= b.from) problems.push(`${name} "${b.label}": the end must be after the start.`);
      if (i > 0 && b.from < bands[i - 1].to) problems.push(`${name}: "${bands[i - 1].label}" and "${b.label}" overlap.`);
    });
    const gaps: string[] = [];
    for (let h = s.openHour; h < s.closeHour; h++) {
      if (!bands.some((b) => h >= b.from && h < b.to)) gaps.push(formatHour(h));
    }
    if (gaps.length) problems.push(`${name} has no rate at ${gaps.join(", ")}.`);
  }
  for (const sport of Object.keys(s.pricing) as Sport[]) {
    if (!sports.includes(sport)) problems.push(`This venue has no ${SPORT_LABEL[sport].toLowerCase()} courts.`);
  }
  return [...new Set(problems)];
}

export async function updateVenueSettings(db: DB, venueId: string, input: z.infer<typeof venueSettings>): Promise<Venue> {
  const venue = await getVenueById(db, venueId);
  const sports = [...new Set(venue.courts.map((c) => c.sport))];
  const problems = settingsProblems(input, sports);
  if (problems.length) {
    throw Object.assign(badRequest("INVALID_SETTINGS", problems[0]), { details: problems.map((message) => ({ message })) });
  }

  await db.$transaction([
    db.rateBand.deleteMany({ where: { venueId } }),
    db.rateBand.createMany({
      data: Object.entries(input.pricing).flatMap(([sport, bands]) =>
        (bands ?? []).map((b) => ({ venueId, sport: sport as Sport, fromHour: b.from, toHour: b.to, price: b.price, label: b.label })),
      ),
    }),
    db.venue.update({
      where: { id: venueId },
      data: {
        openHour: input.openHour,
        closeHour: input.closeHour,
        freeCancelHours: input.cancellation.freeUntilHours,
        lateRefundPercent: input.cancellation.lateRefundPercent,
        payAtVenue: input.payAtVenue,
      },
    }),
  ]);
  return getVenueById(db, venueId);
}
