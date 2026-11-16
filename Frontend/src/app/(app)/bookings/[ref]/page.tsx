import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingDetail } from "@/components/player/BookingDetail";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import ui from "@/components/ui/ui.module.css";

export const metadata: Metadata = {
  title: "Booking",
  robots: { index: false },
};

// Booking refs are only known in the browser (demo store), so the page is an
// App Shell and the detail streams in behind Suspense.
export default function BookingPage({ params }: PageProps<"/bookings/[ref]">) {
  return (
    <div className={`wrap ${ui.page}`}>
      <Suspense fallback={<BlockSkeleton height={420} label="Loading booking" />}>
        <BookingDetail params={params} />
      </Suspense>
    </div>
  );
}
