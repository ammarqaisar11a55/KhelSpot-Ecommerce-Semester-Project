import { createHash } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { Deps } from "../app.ts";
import { ApiError } from "./errors.ts";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const unauthenticated = () => new ApiError(401, "UNAUTHENTICATED", "Sign in to continue.");
export const notYourVenue = () => new ApiError(403, "NOT_YOUR_VENUE", "Your account doesn't manage this venue.");

export function bearerToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token.trim() : null;
}

/** The signed-in phone number, or null. Expired sessions count as signed out. */
export async function sessionPhone(req: FastifyRequest, { db, now }: Pick<Deps, "db" | "now">): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) } });
  if (!session || session.expiresAt <= now()) return null;
  return session.phone;
}

export async function requirePhone(req: FastifyRequest, deps: Pick<Deps, "db" | "now">): Promise<string> {
  const phone = await sessionPhone(req, deps);
  if (!phone) throw unauthenticated();
  return phone;
}

/** Signed in, and listed in venue_owners for this venue. */
export async function requireOwner(req: FastifyRequest, deps: Pick<Deps, "db" | "now">, venueId: string): Promise<string> {
  const phone = await requirePhone(req, deps);
  const link = await deps.db.venueOwner.findUnique({ where: { phone_venueId: { phone, venueId } } });
  if (!link) throw notYourVenue();
  return phone;
}
