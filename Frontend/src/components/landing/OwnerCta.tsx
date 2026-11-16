"use client";

import { requestWaitlistRole } from "./waitlist-role";

export function OwnerCta() {
  return (
    <a className="btn btn--accent btn--block" href="#join" onClick={() => requestWaitlistRole("owner")}>
      Start the free month
    </a>
  );
}
