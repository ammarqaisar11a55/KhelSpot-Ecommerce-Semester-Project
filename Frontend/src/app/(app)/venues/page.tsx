import type { Metadata } from "next";
import { Suspense } from "react";
import { VenueBrowser } from "@/components/player/VenueBrowser";
import { GridSkeleton } from "@/components/ui/Skeletons";
import ui from "@/components/ui/ui.module.css";

export const metadata: Metadata = {
  title: "Find a court",
  description: "Padel, futsal, indoor cricket and badminton courts in Lahore, Karachi and Islamabad with live free slots.",
};

export default function VenuesPage() {
  return (
    <div className={`wrap ${ui.page}`}>
      <div className={ui.pageHead}>
        <div>
          <h1 className={ui.title}>Find a court</h1>
          <p className={ui.subtitle}>Pick a city, sport and day to see which courts still have free slots.</p>
        </div>
      </div>
      <Suspense fallback={<GridSkeleton />}>
        <VenueBrowser />
      </Suspense>
    </div>
  );
}
