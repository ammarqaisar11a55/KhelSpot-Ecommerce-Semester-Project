import type { Metadata } from "next";
import { AuthShell } from "@/components/owners/AuthShell";
import { OwnerLogin } from "@/components/owners/OwnerLogin";

export const metadata: Metadata = { title: "Sign in" };

export default function OwnerLoginPage() {
  return (
    <AuthShell
      title="Tonight's bookings, in one place."
      intro={
        <p>
          See every court, take walk-ins, mark cash as collected and check what came in today. Sign in with the mobile
          number on your venue account.
        </p>
      }
    >
      <OwnerLogin />
    </AuthShell>
  );
}
