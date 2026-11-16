import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SlotPicker } from "@/components/player/SlotPicker";
import s from "@/components/player/player.module.css";
import { CourtArt } from "@/components/ui/CourtArt";
import { BlockSkeleton } from "@/components/ui/Skeletons";
import ui from "@/components/ui/ui.module.css";
import { VENUES, getVenueBySlug, venueSports } from "@/lib/catalog/venues";
import { SPORT_LABEL } from "@/lib/domain/types";

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
  const sports = venueSports(venue);

  return (
    <>
      <section className={s.venueHero}>
        <div className={`wrap ${s.venueHeroGrid}`}>
          <div>
            <p className={s.crumbs}>
              <Link href="/venues">Courts</Link> / <Link href={`/venues?city=${venue.city}`}>{venue.city}</Link>
            </p>
            <h1 className={s.venueTitle}>{venue.name}</h1>
            <p className={s.venueAddress}>{venue.address}</p>
            <div className={s.tagRow}>
              {sports.map((sp) => (
                <span key={sp} className={s.darkTag}>
                  {SPORT_LABEL[sp]}
                </span>
              ))}
              <span className={s.darkTag}>
                {venue.courts.length} {venue.courts.length === 1 ? "court" : "courts"}
              </span>
            </div>
          </div>
          <div className={s.venueHeroArt}>
            <CourtArt sport={sports[0]} />
          </div>
        </div>
      </section>

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
        <div className={s.twoCol}>
          <div className={ui.card}>
            <h2 className={ui.cardTitle}>About this venue</h2>
            <p>{venue.description}</p>
          </div>
          <div className={ui.card}>
            <h2 className={ui.cardTitle}>Facilities</h2>
            <ul className={s.infoList}>
              {venue.amenities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
