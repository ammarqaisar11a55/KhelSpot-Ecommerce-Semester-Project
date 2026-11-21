import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardHeader, VenueBrowser } from "@/components/player/VenueBrowser";
import { BlockSkeleton } from "@/components/ui/Skeletons";

export const metadata: Metadata = {
  title: "Free courts near you",
  description: "Padel, futsal, indoor cricket and badminton courts near you, with the times still open tonight.",
};

export default function VenuesPage() {
  return (
    <Suspense
      fallback={
        <>
          <BoardHeader />
          <div className="wrap" style={{ paddingBlock: "28px 80px" }}>
            <BlockSkeleton height={420} label="Loading free courts" />
          </div>
        </>
      }
    >
      <VenueBrowser />
    </Suspense>
  );
}
