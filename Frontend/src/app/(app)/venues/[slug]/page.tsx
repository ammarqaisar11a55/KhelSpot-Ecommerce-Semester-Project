import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SlotPicker } from "@/components/player/SlotPicker";
import { VenueAbout, VenueHero } from "@/components/player/VenueProfileView";
import s from "@/components/player/player.module.css";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import { VENUES, getVenueBySlug } from "@/lib/catalog/venues";

export function generateStaticParams() {
  return VENUES.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: PageProps<"/venues/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) return {};
  return {
    title: `${venue.name}, ${venue.area}`,
    description: venue.description,
  };
}

// The page itself never awaits params, so client navigations can show the
// skeleton instantly; known slugs are still fully prerendered at build time.
export default function VenuePage({ params }: PageProps<"/venues/[slug]">) {
  return (
    <Suspense fallback={<VenueSkeleton />}>
      <VenueContent params={params} />
    </Suspense>
  );
}

function VenueSkeleton() {
  return (
    <>
      <section className={s.venueHero}>
        <div className="wrap" style={{ height: 150 }} />
      </section>
      <div className={`wrap ${s.venueLayout}`}>
        <BlockSkeleton height={520} label="Loading venue" />
        <BlockSkeleton height={320} label="Loading summary" />
      </div>
    </>
  );
}

async function VenueContent({ params }: Pick<PageProps<"/venues/[slug]">, "params">) {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) notFound();

  return (
    <>
      <VenueHero venue={venue} />

      <Suspense
        fallback={
          <div className={`wrap ${s.venueLayout}`}>
            <BlockSkeleton height={520} label="Loading free slots" />
            <BlockSkeleton height={320} label="Loading summary" />
          </div>
        }
      >
        <SlotPicker venueId={venue.id} />
      </Suspense>

      <section className="wrap" style={{ paddingBottom: 72 }}>
        <VenueAbout venue={venue} />
      </section>
    </>
  );
}
