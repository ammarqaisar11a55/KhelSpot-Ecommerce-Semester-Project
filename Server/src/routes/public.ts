import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Deps } from "../app.ts";
import { operatingNow } from "../domain/time.ts";
import { requirePhone } from "../http/auth.ts";
import { parse } from "../http/errors.ts";
import { allowedReturnUrl } from "../http/return-url.ts";
import { isoDate, newBooking, phone, sport } from "../http/schemas.ts";
import { availability, cancelBooking, createBooking, failPayment, getPlayerBooking } from "../services/bookings.ts";
import { getVenueBySlug, listVenues } from "../services/venues.ts";

export async function publicRoutes(app: FastifyInstance, deps: Deps) {
  const { db, now, payments, settings } = deps;

  /** Guests prove a booking is theirs with the phone it was made with; signed-in players with their token. */
  async function playerPhone(req: FastifyRequest, given: string | undefined) {
    return given ?? (await requirePhone(req, deps));
  }

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

  // Guest booking is allowed; no token needed.
  app.post("/bookings", async (req, reply) => {
    const body = parse(newBooking, req.body);
    const online = body.payment !== "cash";
    const booking = await createBooking(
      db,
      {
        ...body,
        source: "online",
        ...(online
          ? { paymentProvider: payments.name, returnUrl: allowedReturnUrl(body.returnUrl, settings.paymentReturnAllow) }
          : {}),
      },
      now(),
    );
    if (!online) return reply.code(201).send({ booking });

    try {
      const checkout = await payments.startCheckout(booking, { baseUrl: deps.baseUrl(req) });
      return reply.code(201).send({ booking, checkout });
    } catch (err) {
      await failPayment(db, booking.ref, now()); // don't leave a hold nobody can pay
      throw err;
    }
  });

  app.get("/bookings/:ref", async (req) => {
    const { ref } = parse(z.object({ ref: z.string() }), req.params);
    const q = parse(z.object({ phone: phone.optional() }), req.query);
    return { booking: await getPlayerBooking(db, ref, await playerPhone(req, q.phone), now()) };
  });

  app.post("/bookings/:ref/cancel", async (req) => {
    const { ref } = parse(z.object({ ref: z.string() }), req.params);
    const body = parse(z.object({ phone: phone.optional() }), req.body ?? {});
    const who = await playerPhone(req, body.phone);
    return { booking: await cancelBooking(db, ref, { kind: "player", phone: who }, now()) };
  });
}
