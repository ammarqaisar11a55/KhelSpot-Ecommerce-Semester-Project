import type { Metadata } from "next";
import { Suspense } from "react";
import { MyBookings } from "@/components/player/MyBookings";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import ui from "@/components/ui/ui.module.css";

export const metadata: Metadata = {
  title: "My bookings",
  robots: { index: false },
};

export default function BookingsPage() {
  return (
    <div className={`wrap ${ui.page}`}>
      <div className={ui.pageHead}>
        <div>
          <h1 className={ui.title}>My bookings</h1>
          <p className={ui.subtitle}>Bookings made on this device.</p>
        </div>
      </div>
      <Suspense fallback={<BlockSkeleton height={320} label="Loading bookings" />}>
        <MyBookings />
      </Suspense>
    </div>
  );
}
