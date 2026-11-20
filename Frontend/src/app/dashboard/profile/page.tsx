import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { BlockSkeleton } from "@/components/ui/Skeletons";

export const metadata: Metadata = { title: "Venue profile" };

export default function ProfilePage() {
  return (
    <Suspense fallback={<BlockSkeleton height={640} label="Loading venue profile" />}>
      <ProfileForm />
    </Suspense>
  );
}
