// Lets a CTA elsewhere on the page switch the waitlist form to the owner role.
export type WaitlistRole = "player" | "owner";

export const WAITLIST_ROLE_EVENT = "khelspot:waitlist-role";

export function requestWaitlistRole(role: WaitlistRole) {
  window.dispatchEvent(new CustomEvent<WaitlistRole>(WAITLIST_ROLE_EVENT, { detail: role }));
}
