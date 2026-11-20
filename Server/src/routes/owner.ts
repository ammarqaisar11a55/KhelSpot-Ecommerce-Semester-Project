// Venue owner endpoints. Every route needs a signed-in phone that venue_owners
// lists for the venue concerned: 401 UNAUTHENTICATED without a valid token,
// 403 NOT_YOUR_VENUE for anyone else's venue.

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Deps } from "../app.ts";
import { requireOwner, requirePhone } from "../http/auth.ts";
import { parse } from "../http/errors.ts";
import { bookingQuery, venueSettings, walkInBooking } from "../http/schemas.ts";
import {
  bookingVenueId,
  cancelBooking,
  createWalkIn,
  getBooking,
  markPaid,
  venueBookings,
  venueCustomers,
} from "../services/bookings.ts";
import { getVenueById, updateVenueSettings } from "../services/venues.ts";

const venueParams = z.object({ id: z.string() });
const refParams = z.object({ ref: z.string() });

export async function ownerRoutes(app: FastifyInstance, deps: Deps) {
  const { db, now } = deps;

  app.get("/owner/venues/:id", async (req) => {
    const { id } = parse(venueParams, req.params);
    await requireOwner(req, deps, id);
    return { venue: await getVenueById(db, id) };
  });

  app.get("/owner/venues/:id/bookings", async (req) => {
    const { id } = parse(venueParams, req.params);
    await requireOwner(req, deps, id);
    const q = parse(bookingQuery, req.query);
    return { bookings: await venueBookings(db, id, q.from, q.to, now(), q.status) };
  });

  app.get("/owner/venues/:id/customers", async (req) => {
    const { id } = parse(venueParams, req.params);
    await requireOwner(req, deps, id);
    return { customers: await venueCustomers(db, id, now()) };
  });

  app.put("/owner/venues/:id/settings", async (req) => {
    const { id } = parse(venueParams, req.params);
    await requireOwner(req, deps, id);
    const body = parse(venueSettings, req.body);
    return { venue: await updateVenueSettings(db, id, body) };
  });

  app.post("/owner/bookings", async (req, reply) => {
    const body = parse(walkInBooking, req.body);
    await requireOwner(req, deps, body.venueId);
    return reply.code(201).send({ booking: await createWalkIn(db, body, now()) });
  });

  app.get("/owner/bookings/:ref", async (req) => {
    const { ref } = parse(refParams, req.params);
    await requirePhone(req, deps); // before the lookup, so signed-out callers can't probe refs
    await requireOwner(req, deps, await bookingVenueId(db, ref));
    return { booking: await getBooking(db, ref, now()) };
  });

  app.post("/owner/bookings/:ref/mark-paid", async (req) => {
    const { ref } = parse(refParams, req.params);
    await requirePhone(req, deps); // before the lookup, so signed-out callers can't probe refs
    await requireOwner(req, deps, await bookingVenueId(db, ref));
    return { booking: await markPaid(db, ref, now()) };
  });

  app.post("/owner/bookings/:ref/cancel", async (req) => {
    const { ref } = parse(refParams, req.params);
    await requirePhone(req, deps); // before the lookup, so signed-out callers can't probe refs
    await requireOwner(req, deps, await bookingVenueId(db, ref));
    return { booking: await cancelBooking(db, ref, { kind: "owner" }, now()) };
  });
}
