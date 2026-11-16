// Seeds the Lahore launch venues. Safe to run again: venues, courts and rates
// are upserted from seed-data.ts; bookings and customers are never touched.
import "../src/env.ts";
import { createDb } from "../src/db.ts";
import type { Sport } from "../src/domain/types.ts";
import { VENUES } from "./seed-data.ts";

const db = createDb();

for (const v of VENUES) {
  const data = {
    slug: v.slug,
    name: v.name,
    city: v.city,
    area: v.area,
    address: v.address,
    description: v.description,
    amenities: v.amenities,
    openHour: v.openHour,
    closeHour: v.closeHour,
    freeCancelHours: v.cancellation.freeUntilHours,
    lateRefundPercent: v.cancellation.lateRefundPercent,
    payAtVenue: v.payAtVenue,
    photoSrc: v.photo?.src ?? null,
    photoAlt: v.photo?.alt ?? null,
    photoCredit: v.photo?.credit ?? null,
    photoCreditUrl: v.photo?.creditUrl ?? null,
  };
  await db.$transaction([
    db.venue.upsert({ where: { id: v.id }, update: data, create: { id: v.id, ...data } }),
    ...v.courts.map((c) =>
      db.court.upsert({
        where: { id: c.id },
        update: { name: c.name, sport: c.sport },
        create: { id: c.id, venueId: v.id, name: c.name, sport: c.sport },
      }),
    ),
    db.rateBand.deleteMany({ where: { venueId: v.id } }),
    db.rateBand.createMany({
      data: Object.entries(v.pricing).flatMap(([sport, bands]) =>
        (bands ?? []).map((b) => ({ venueId: v.id, sport: sport as Sport, fromHour: b.from, toHour: b.to, price: b.price, label: b.label })),
      ),
    }),
  ]);
  console.log(`Seeded ${v.name} (${v.courts.length} courts)`);
}

await db.$disconnect();
