import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerCalendar } from "@/components/dashboard/OwnerCalendar";
import { BlockSkeleton } from "@/components/ui/Skeletons";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <Suspense fallback={<BlockSkeleton height={640} label="Loading calendar" />}>
      <OwnerCalendar />
    </Suspense>
  );
}
