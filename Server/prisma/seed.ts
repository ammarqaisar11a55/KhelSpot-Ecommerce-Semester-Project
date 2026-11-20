// Seeds the Lahore launch venues and their owners. Safe to run again: venues,
// courts and rates are upserted from seed-data.ts; bookings and customers are never touched.
import { config } from "../src/env.ts";
import { createDb } from "../src/db.ts";
import { phone } from "../src/http/schemas.ts";
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

// Venue owners from OWNER_PHONES, e.g. "v-baseline:03001112233,v-crease:03002223344".
// Adds links; never removes ones added another way.
const owners = parseOwnerPhones(config.ownerPhones);
for (const { venueId, phone } of owners) {
  await db.venueOwner.upsert({
    where: { phone_venueId: { phone, venueId } },
    update: {},
    create: { phone, venueId },
  });
  console.log(`Owner ${phone} -> ${venueId}`);
}
if (!owners.length) console.log("No OWNER_PHONES set, so no venue owners were added.");

await db.$disconnect();

function parseOwnerPhones(raw: string) {
  const known = new Set(VENUES.map((v) => v.id));
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [venueId, rawPhone] = entry.split(":").map((s) => s?.trim());
      const parsed = phone.safeParse(rawPhone ?? "");
      if (!venueId || !known.has(venueId) || !parsed.success) {
        throw new Error(`OWNER_PHONES entry "${entry}" should look like v-baseline:03001112233 with a known venue id.`);
      }
      return { venueId, phone: parsed.data };
    });
}
