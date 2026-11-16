import type { Metadata } from "next";
import { Suspense } from "react";
import { Customers } from "@/components/dashboard/Customers";
import { BlockSkeleton } from "@/components/ui/Skeletons";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <Suspense fallback={<BlockSkeleton height={560} label="Loading customers" />}>
      <Customers />
    </Suspense>
  );
}
