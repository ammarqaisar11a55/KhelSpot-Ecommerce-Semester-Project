import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Checkout } from "@/components/player/Checkout";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import ui from "@/components/ui/ui.module.css";
import { VENUES, getVenueBySlug } from "@/lib/catalog/venues";

export function generateStaticParams() {
  return VENUES.map((v) => ({ slug: v.slug }));
}

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage({ params }: PageProps<"/venues/[slug]/checkout">) {
  return (
    <div className={`wrap ${ui.page}`}>
      <div className={ui.pageHead}>
        <div>
          <h1 className={ui.title}>Confirm and pay</h1>
          <p className={ui.subtitle}>Your slot is confirmed as soon as payment goes through.</p>
        </div>
      </div>
      <Suspense fallback={<BlockSkeleton height={560} label="Loading checkout" />}>
        <CheckoutForVenue params={params} />
      </Suspense>
    </div>
  );
}

async function CheckoutForVenue({ params }: Pick<PageProps<"/venues/[slug]/checkout">, "params">) {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) notFound();
  return <Checkout venueId={venue.id} />;
}
