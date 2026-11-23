// Venue owner demo: one switch in Account signs in as Night Owl Arena's demo owner,
// whose dashboard is filled with sample bookings on the demo Server. It works only where
// the Server hands back the sign-in code (OTP_DEV_ECHO), so it can never reach a real
// owner's account by guessing a code.

import { ApiError, auth } from "@/api/client";
import { signedIn, signedOut, type User } from "@/auth/session";

/** Linked to Night Owl Arena in khelspot.venue_owners on the demo Server. */
export const DEMO_OWNER_PHONE = "03000000001";

export const isDemoOwner = (user: User | null | undefined) => user?.phone === DEMO_OWNER_PHONE;

export async function enterOwnerDemo(): Promise<User> {
  const { devCode } = await auth.requestCode(DEMO_OWNER_PHONE);
  if (!devCode) {
    throw new ApiError(
      "DEMO_UNAVAILABLE",
      "This server sends real SMS codes, so the owner demo isn't available here. Use the demo server.",
    );
  }
  const { token, user } = await auth.verify(DEMO_OWNER_PHONE, devCode);
  if (!user.ownerOf.length) {
    throw new ApiError("DEMO_UNAVAILABLE", "The demo owner isn't linked to a venue on this server.");
  }
  signedIn(token, user);
  return user;
}

export async function leaveOwnerDemo(): Promise<void> {
  await auth.logout().catch(() => {}); // the session is dropped on this phone either way
  signedOut();
}
