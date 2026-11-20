// Phone sign-in with one-time codes, for players and venue owners alike.

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { DB } from "../db.ts";
import { sha256 } from "../http/auth.ts";
import { ApiError, badRequest } from "../http/errors.ts";
import type { SmsProvider } from "./sms.ts";

export const OTP = {
  ttlMs: 5 * 60_000,
  maxAttempts: 5,
  maxSends: 3,
  sendWindowMs: 10 * 60_000,
} as const;

export const SESSION_TTL_MS = 90 * 24 * 60 * 60_000;

export interface UserView {
  phone: string;
  name: string | null;
  ownerOf: { venueId: string; slug: string; name: string }[];
}

const hashCode = (secret: string, phone: string, code: string) =>
  createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Sends a 6-digit code. Returns the code so callers may echo it in development. */
export async function sendOtp(db: DB, sms: SmsProvider, secret: string, phone: string, now: Date): Promise<string> {
  const recent = await db.otpCode.count({
    where: { phone, createdAt: { gt: new Date(now.getTime() - OTP.sendWindowMs) } },
  });
  if (recent >= OTP.maxSends) {
    throw new ApiError(429, "TOO_MANY", "Too many codes sent to this number. Try again in 10 minutes.");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.$transaction([
    // Only the newest code works.
    db.otpCode.updateMany({ where: { phone, usedAt: null }, data: { usedAt: now } }),
    db.otpCode.create({
      data: { phone, codeHash: hashCode(secret, phone, code), createdAt: now, expiresAt: new Date(now.getTime() + OTP.ttlMs) },
    }),
  ]);
  await sms.send(phone, `${code} is your KhelSpot code. It expires in 5 minutes. Don't share it with anyone.`);
  return code;
}

/** Checks the code and opens a session. Returns the bearer token (stored only as a hash). */
export async function verifyOtp(db: DB, secret: string, phone: string, code: string, now: Date) {
  const latest = await db.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  const expired = () => badRequest("CODE_EXPIRED", "This code has expired. Ask for a new one.");
  if (!latest || latest.usedAt || latest.expiresAt <= now || latest.attempts >= OTP.maxAttempts) throw expired();

  if (!sameHash(latest.codeHash, hashCode(secret, phone, code))) {
    const attempts = latest.attempts + 1;
    await db.otpCode.update({ where: { id: latest.id }, data: { attempts } });
    const left = OTP.maxAttempts - attempts;
    if (left <= 0) throw badRequest("CODE_EXPIRED", "That code was wrong too many times. Ask for a new one.");
    throw badRequest("CODE_WRONG", `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`);
  }

  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.otpCode.update({ where: { id: latest.id }, data: { usedAt: now } }),
    db.user.upsert({ where: { phone }, update: {}, create: { phone } }),
    db.session.create({
      data: { tokenHash: sha256(token), phone, createdAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) },
    }),
  ]);
  return { token, user: await userView(db, phone) };
}

export async function logout(db: DB, token: string | null) {
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

export async function userView(db: DB, phone: string): Promise<UserView> {
  const [user, owned] = await Promise.all([
    db.user.findUnique({ where: { phone } }),
    db.venueOwner.findMany({ where: { phone }, include: { venue: { select: { id: true, slug: true, name: true } } } }),
  ]);
  return {
    phone,
    name: user?.name ?? null,
    ownerOf: owned
      .map((o) => ({ venueId: o.venue.id, slug: o.venue.slug, name: o.venue.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function updateName(db: DB, phone: string, name: string) {
  await db.user.upsert({ where: { phone }, update: { name }, create: { phone, name } });
  return userView(db, phone);
}
