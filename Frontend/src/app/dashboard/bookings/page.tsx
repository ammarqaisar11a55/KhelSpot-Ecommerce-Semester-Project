import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingsTable } from "@/components/dashboard/BookingsTable";
import { BlockSkeleton } from "@/components/ui/Skeletons";

export const metadata: Metadata = { title: "Bookings" };

export default function OwnerBookingsPage() {
  return (
    <Suspense fallback={<BlockSkeleton height={560} label="Loading bookings" />}>
      <BookingsTable />
    </Suspense>
  );
}
