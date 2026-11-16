import type { Metadata } from "next";
import { Suspense } from "react";
import { Overview } from "@/components/dashboard/Overview";
import { BlockSkeleton } from "@/components/ui/Skeletons";

export const metadata: Metadata = { title: "Overview" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<BlockSkeleton height={560} label="Loading overview" />}>
      <Overview />
    </Suspense>
  );
}
