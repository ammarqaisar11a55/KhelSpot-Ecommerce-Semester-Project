import type { Metadata } from "next";
import { AuthShell } from "@/components/owners/AuthShell";
import o from "@/components/owners/owners.module.css";
import { OwnerSignup } from "@/components/owners/OwnerSignup";

export const metadata: Metadata = { title: "List your courts" };

export default function OwnerSignupPage() {
  return (
    <AuthShell
      title="Stop running bookings from your phone."
      intro={
        <p>
          Players see your free slots and prices, pay online and get a confirmation on WhatsApp. You get the calendar,
          payments, customers and revenue in one dashboard.
        </p>
      }
      aside={
        <p className={o.plan}>
          <span className={o.planPrice}>Rs 999 a month</span>
          <span className={o.planTerms}>after a free month. No commission on bookings.</span>
        </p>
      }
    >
      <OwnerSignup />
    </AuthShell>
  );
}
