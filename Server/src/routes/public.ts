import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { operatingNow } from "../domain/time.ts";
import { parse } from "../http/errors.ts";
import { isoDate, newBooking, phone, sport } from "../http/schemas.ts";
import { availability, cancelBooking, createBooking, getPlayerBooking } from "../services/bookings.ts";
import { getVenueBySlug, listVenues } from "../services/venues.ts";
import type { AppDeps } from "../app.ts";

export async function publicRoutes(app: FastifyInstance, { db, now }: AppDeps) {
  app.get("/venues", async (req) => {
    const q = parse(
      z.object({ city: z.string().optional(), area: z.string().optional(), sport: sport.optional() }),
      req.query,
    );
    return { venues: await listVenues(db, q) };
  });

  app.get("/venues/:slug", async (req) => {
    const { slug } = parse(z.object({ slug: z.string() }), req.params);
    return { venue: await getVenueBySlug(db, slug) };
  });

  app.get("/venues/:slug/availability", async (req) => {
    const { slug } = parse(z.object({ slug: z.string() }), req.params);
    const at = now();
    const q = parse(z.object({ date: isoDate.optional(), courtId: z.string().optional() }), req.query);
    const venue = await getVenueBySlug(db, slug);
    return availability(db, venue, q.date ?? operatingNow(at).date, at, q.courtId);
  });

  app.post("/bookings", async (req, reply) => {
    const body = parse(newBooking, req.body);
    const booking = await createBooking(db, { ...body, source: "online" }, now());
    return reply.code(201).send({ booking });
  });

  // No accounts yet: the phone number used to book acts as the key.
  app.get("/bookings/:ref", async (req) => {
    const { ref } = parse(z.object({ ref: z.string() }), req.params);
    const q = parse(z.object({ phone }), req.query);
    return { booking: await getPlayerBooking(db, ref, q.phone) };
  });

  app.post("/bookings/:ref/cancel", async (req) => {
    const { ref } = parse(z.object({ ref: z.string() }), req.params);
    const body = parse(z.object({ phone }), req.body);
    return { booking: await cancelBooking(db, ref, { kind: "player", phone: body.phone }, now()) };
  });
}
