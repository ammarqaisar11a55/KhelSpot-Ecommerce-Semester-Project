// Phone sign-in and the signed-in user's own data.

import type { FastifyInstance } from "fastify";
import type { Deps } from "../app.ts";
import { bearerToken, requirePhone } from "../http/auth.ts";
import { parse } from "../http/errors.ts";
import { otpRequest, otpVerify, profileUpdate } from "../http/schemas.ts";
import { logout, sendOtp, updateName, userView, verifyOtp } from "../services/auth.ts";
import { myBookings } from "../services/bookings.ts";

export async function authRoutes(app: FastifyInstance, deps: Deps) {
  const { db, now, sms, settings } = deps;

  app.post("/auth/otp", async (req, reply) => {
    const { phone } = parse(otpRequest, req.body);
    const code = await sendOtp(db, sms, settings.otpSecret, phone, now());
    // Development, or a demo deployment (OTP_DEV_ECHO=1 plus ALLOW_DEMO_OTP=1): hand the code back.
    if (settings.otpDevEcho) return reply.code(200).send({ devCode: code });
    return reply.code(204).send();
  });

  app.post("/auth/verify", async (req) => {
    const { phone, code } = parse(otpVerify, req.body);
    return verifyOtp(db, settings.otpSecret, phone, code, now());
  });

  app.post("/auth/logout", async (req, reply) => {
    await logout(db, bearerToken(req));
    return reply.code(204).send();
  });

  app.get("/me", async (req) => {
    const phone = await requirePhone(req, deps);
    return { user: await userView(db, phone) };
  });

  app.patch("/me", async (req) => {
    const phone = await requirePhone(req, deps);
    const { name } = parse(profileUpdate, req.body);
    return { user: await updateName(db, phone, name) };
  });

  app.get("/me/bookings", async (req) => {
    const phone = await requirePhone(req, deps);
    return { bookings: await myBookings(db, phone, now()) };
  });
}
