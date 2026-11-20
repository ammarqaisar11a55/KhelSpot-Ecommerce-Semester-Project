"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import s from "@/components/player/player.module.css";
import { CourtArt } from "@/components/ui/CourtArt";
import ui from "@/components/ui/ui.module.css";
import { venueSports } from "@/lib/catalog/venues";
import { directionsUrl, embedUrl } from "@/lib/domain/maps";
import { SPORT_LABEL, type Venue } from "@/lib/domain/types";
import { venueWithSettings } from "@/lib/store/queries";
import { useStore } from "@/lib/store/store";

/**
 * The venue as its owner describes it. The page is prerendered from the
 * listing; once the browser's saved data is read, the owner's own name,
 * photo and details replace it.
 */
function useVenue(listed: Venue): Venue {
  return venueWithSettings(useStore(), listed);
}

export function VenueHero({ venue: listed }: { venue: Venue }) {
  const venue = useVenue(listed);
  const sports = venueSports(venue);
  const photo = venue.photo;

  return (
    <section className={s.venueHero}>
      {photo && (
        <>
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority="high"
            unoptimized={photo.src.startsWith("data:")}
            className={s.venueHeroPhoto}
          />
          <div className={s.venueHeroGlass} aria-hidden />
        </>
      )}
      <div className={photo ? "wrap" : `wrap ${s.venueHeroGrid}`}>
        <div>
          <p className={s.crumbs}>
            <Link href="/venues">Courts</Link> /{" "}
            <Link href={`/venues?area=${encodeURIComponent(venue.area)}`}>{venue.area}</Link>
          </p>
          <h1 className={s.venueTitle}>{venue.name}</h1>
          <p className={s.venueAddress}>
            {venue.address}
            <a className={s.heroDirections} href={directionsUrl(venue)} target="_blank" rel="noopener noreferrer">
              Get directions
            </a>
          </p>
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
        {!photo && (
          <div className={s.venueHeroArt}>
            <CourtArt sport={sports[0]} />
          </div>
        )}
      </div>
    </section>
  );
}

/** The address, directions, and a map that loads only when asked for. Sits under the rates. */
export function VenueLocation({ venue }: { venue: Venue }) {
  const [showMap, setShowMap] = useState(false);
  const map = embedUrl(venue);
  return (
    <section className={`${ui.card} ${s.location}`} aria-labelledby="location-title">
      <h2 id="location-title" className={ui.cardTitle}>
        Location
      </h2>
      {map && (
        <div className={s.locationMap}>
          {showMap ? (
            <iframe src={map} title={`Map showing ${venue.name}`} loading="lazy" />
          ) : (
            <button type="button" className={s.mapReveal} onClick={() => setShowMap(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z" />
                <circle cx="12" cy="11" r="2.2" />
              </svg>
              <span>Show the map</span>
              <span className={s.mapNote}>Loads Google Maps</span>
            </button>
          )}
        </div>
      )}
      <div className={s.locationText}>
        <p>{venue.address}</p>
        <a
          className={`${ui.btnDark} ${s.locationButton}`}
          href={directionsUrl(venue)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get directions
        </a>
        <p className={ui.hint}>
          Opens Google Maps{venue.mapUrl ? " at the pin the venue set" : ", searching for this address"}.
        </p>
      </div>
    </section>
  );
}

export function VenueAbout({ venue: listed }: { venue: Venue }) {
  const venue = useVenue(listed);
  return (
    <div className={s.twoCol}>
      <div className={ui.card}>
        <h2 className={ui.cardTitle}>About this venue</h2>
        <p>{venue.description}</p>
      </div>
      <div className={ui.card}>
        <h2 className={ui.cardTitle}>Facilities</h2>
        {venue.amenities.length ? (
          <ul className={s.infoList}>
            {venue.amenities.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ) : (
          <p className={ui.muted}>The venue hasn&apos;t listed its facilities yet.</p>
        )}
      </div>
    </div>
  );
}
