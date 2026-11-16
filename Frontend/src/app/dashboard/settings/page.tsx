import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { BlockSkeleton } from "@/components/ui/Skeletons";

export const metadata: Metadata = { title: "Prices and rules" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<BlockSkeleton height={640} label="Loading settings" />}>
      <SettingsForm />
    </Suspense>
  );
}
