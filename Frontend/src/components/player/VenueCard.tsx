import Link from "next/link";
import { CourtArt } from "@/components/ui/CourtArt";
import ui from "@/components/ui/ui.module.css";
import { venueSports } from "@/lib/catalog/venues";
import { formatRupees, lowestRate } from "@/lib/domain/pricing";
import { formatHour } from "@/lib/domain/time";
import { SPORT_LABEL, type Sport, type Venue } from "@/lib/domain/types";
import s from "./player.module.css";

interface VenueCardProps {
  venue: Venue;
  sport?: Sport;
  freeSlots: number;
  dayLabel: string;
}

export function VenueCard({ venue, sport, freeSlots, dayLabel }: VenueCardProps) {
  const sports = venueSports(venue);
  const shown = sport ?? sports[0];
  const from = Math.min(...sports.map((sp) => lowestRate(venue.pricing[sp]) ?? Infinity));
  const href = sport ? `/venues/${venue.slug}?sport=${sport}` : `/venues/${venue.slug}`;

  return (
    <Link href={href} className={s.venueCard}>
      <CourtArt sport={shown} className={s.venueArt} />
      <div className={s.venueBody}>
        <h2 className={s.venueName}>{venue.name}</h2>
        <p className={s.venueWhere}>
          {venue.area}, {venue.city} · {formatHour(venue.openHour)} to {formatHour(venue.closeHour)}
        </p>
        <div className={ui.chips}>
          {sports.map((sp) => (
            <span key={sp} className={ui.badge}>
              {SPORT_LABEL[sp]}
            </span>
          ))}
        </div>
        <div className={s.venueFoot}>
          <span>
            from <span className={s.from}>{Number.isFinite(from) ? formatRupees(from) : "–"}</span>/hr
          </span>
          <span className={freeSlots > 0 ? s.freeCount : s.freeNone}>
            {freeSlots > 0 ? `${freeSlots} free ${dayLabel.toLowerCase()}` : `Full ${dayLabel.toLowerCase()}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
