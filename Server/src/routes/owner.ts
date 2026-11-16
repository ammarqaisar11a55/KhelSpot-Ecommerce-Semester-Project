// Venue owner endpoints.
// TODO(auth): these are open until owner accounts exist. Every route must
// check that the signed-in owner manages the venue before going live.

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { parse } from "../http/errors.ts";
import { bookingQuery, venueSettings, walkInBooking } from "../http/schemas.ts";
import { cancelBooking, createWalkIn, getBooking, markPaid, venueBookings, venueCustomers } from "../services/bookings.ts";
import { getVenueById, updateVenueSettings } from "../services/venues.ts";
import type { AppDeps } from "../app.ts";

const venueParams = z.object({ id: z.string() });
const refParams = z.object({ ref: z.string() });

export async function ownerRoutes(app: FastifyInstance, { db, now }: AppDeps) {
  app.get("/owner/venues/:id", async (req) => {
    const { id } = parse(venueParams, req.params);
    return { venue: await getVenueById(db, id) };
  });

  app.get("/owner/venues/:id/bookings", async (req) => {
    const { id } = parse(venueParams, req.params);
    const q = parse(bookingQuery, req.query);
    return { bookings: await venueBookings(db, id, q.from, q.to, q.status) };
  });

  app.get("/owner/venues/:id/customers", async (req) => {
    const { id } = parse(venueParams, req.params);
    return { customers: await venueCustomers(db, id, now()) };
  });

  app.put("/owner/venues/:id/settings", async (req) => {
    const { id } = parse(venueParams, req.params);
    const body = parse(venueSettings, req.body);
    return { venue: await updateVenueSettings(db, id, body) };
  });

  app.post("/owner/bookings", async (req, reply) => {
    const body = parse(walkInBooking, req.body);
    return reply.code(201).send({ booking: await createWalkIn(db, body, now()) });
  });

  app.get("/owner/bookings/:ref", async (req) => {
    const { ref } = parse(refParams, req.params);
    return { booking: await getBooking(db, ref) };
  });

  app.post("/owner/bookings/:ref/mark-paid", async (req) => {
    const { ref } = parse(refParams, req.params);
    return { booking: await markPaid(db, ref) };
  });

  app.post("/owner/bookings/:ref/cancel", async (req) => {
    const { ref } = parse(refParams, req.params);
    return { booking: await cancelBooking(db, ref, { kind: "owner" }, now()) };
  });
}
