"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ui from "@/components/ui/ui.module.css";
import { VENUES } from "@/lib/catalog/venues";
import { cx } from "@/lib/format";
import { useBrowserOnly, useNow } from "@/lib/hooks";
import { addDays, operatingNow, relativeDay } from "@/lib/domain/time";
import { CITIES, SPORTS, SPORT_LABEL, type City, type Sport, type Venue } from "@/lib/domain/types";
import { bookingsFor, slotsFor, venueWithSettings } from "@/lib/store/queries";
import { useStore } from "@/lib/store/store";
import s from "./player.module.css";
import { VenueCard } from "./VenueCard";

const isCity = (v: string | null): v is City => !!v && (CITIES as readonly string[]).includes(v);
const isSport = (v: string | null): v is Sport => !!v && (SPORTS as readonly string[]).includes(v);

export function VenueBrowser() {
  useBrowserOnly();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useStore();
  const now = useNow();

  const city = isCity(params.get("city")) ? (params.get("city") as City) : undefined;
  const sport = isSport(params.get("sport")) ? (params.get("sport") as Sport) : undefined;
  const q = params.get("q") ?? "";
  const today = operatingNow(now).date;
  const dayOffset = Math.min(6, Math.max(0, Number(params.get("day") ?? 0) || 0));
  const date = addDays(today, dayOffset);
  const dayLabel = relativeDay(date, today);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const needle = q.trim().toLowerCase();
  const results = VENUES.filter((v) => !city || v.city === city)
      .filter((v) => !sport || v.courts.some((c) => c.sport === sport))
      .filter((v) => !needle || `${v.name} ${v.area} ${v.city}`.toLowerCase().includes(needle))
      .map((base) => {
        const venue: Venue = venueWithSettings(state, base);
        const bookings = bookingsFor(state, base, date);
        const free = venue.courts
          .filter((c) => !sport || c.sport === sport)
          .reduce((n, c) => n + slotsFor(venue, c, bookings, date, now).filter((x) => x.status === "free").length, 0);
        return { venue, free };
      })
      .sort((a, b) => b.free - a.free);

  return (
    <>
      <div className={s.filters}>
        <div className={s.filterRow}>
          <span className={s.filterLabel} id="f-city">City</span>
          <div className={ui.chips} role="group" aria-labelledby="f-city">
            <button type="button" className={cx(ui.chip, !city && ui.chipOn)} aria-pressed={!city} onClick={() => setParam("city", undefined)}>
              All cities
            </button>
            {CITIES.map((c) => (
              <button key={c} type="button" className={cx(ui.chip, city === c && ui.chipOn)} aria-pressed={city === c} onClick={() => setParam("city", c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className={s.filterRow}>
          <span className={s.filterLabel} id="f-sport">Sport</span>
          <div className={ui.chips} role="group" aria-labelledby="f-sport">
            <button type="button" className={cx(ui.chip, !sport && ui.chipOn)} aria-pressed={!sport} onClick={() => setParam("sport", undefined)}>
              All sports
            </button>
            {SPORTS.map((sp) => (
              <button key={sp} type="button" className={cx(ui.chip, sport === sp && ui.chipOn)} aria-pressed={sport === sp} onClick={() => setParam("sport", sp)}>
                {SPORT_LABEL[sp]}
              </button>
            ))}
          </div>
        </div>
        <div className={s.filterRow}>
          <span className={s.filterLabel} id="f-day">Day</span>
          <div className={ui.chips} role="group" aria-labelledby="f-day">
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(today, i);
              return (
                <button key={d} type="button" className={cx(ui.chip, i === dayOffset && ui.chipOn)} aria-pressed={i === dayOffset} onClick={() => setParam("day", i ? String(i) : undefined)}>
                  {relativeDay(d, today)}
                </button>
              );
            })}
          </div>
        </div>
        <label className={cx(ui.field, s.search)}>
          <span>Search by name or area</span>
          <input
            className={ui.input}
            type="search"
            defaultValue={q}
            placeholder="e.g. Johar Town"
            onChange={(e) => setParam("q", e.target.value || undefined)}
          />
        </label>
      </div>

      <p className={s.resultsMeta} role="status">
        {results.length} {results.length === 1 ? "venue" : "venues"}
        {city ? ` in ${city}` : ""}
        {sport ? ` with ${SPORT_LABEL[sport].toLowerCase()}` : ""}, sorted by free slots {dayLabel.toLowerCase()}.
      </p>

      {results.length ? (
        <div className={s.venueGrid}>
          {results.map(({ venue, free }) => (
            <VenueCard key={venue.id} venue={venue} sport={sport} freeSlots={free} dayLabel={dayLabel} />
          ))}
        </div>
      ) : (
        <div className={ui.empty}>
          <p>No venues match those filters yet.</p>
          <button type="button" className={ui.btnLight} onClick={() => router.replace(pathname, { scroll: false })}>
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
