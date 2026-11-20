"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { VENUES, venueSports } from "@/lib/catalog/venues";
import { useBrowserOnly, useNow } from "@/lib/hooks";
import { formatRupees, lowestRate } from "@/lib/domain/pricing";
import { addDays, formatDay, formatHour, operatingNow, weekdayShort } from "@/lib/domain/time";
import { SPORTS, SPORT_LABEL, type Hour, type Sport, type Venue } from "@/lib/domain/types";
import { bookingsFor, slotsFor, venueWithSettings } from "@/lib/store/queries";
import { useStore } from "@/lib/store/store";
import { Picker, type PickerOption } from "./Picker";
import v from "./venues.module.css";

const SHOWN_TIMES = 4;
const isSport = (x: string | null): x is Sport => !!x && (SPORTS as readonly string[]).includes(x);

function dayWord(offset: number, today: string): string {
  if (offset === 0) return "tonight";
  if (offset === 1) return "tomorrow";
  return `on ${weekdayShort(addDays(today, offset))}`;
}

function listSports(sports: Sport[]): string {
  const words = sports.map((s) => SPORT_LABEL[s].toLowerCase());
  const text = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : words[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface FreeTime {
  hour: Hour;
  courtId: string;
  courtName: string;
  price: number;
}

/** Static header used while the browser-only board loads. */
export function BoardHeader({ children }: { children?: ReactNode }) {
  return (
    <section className={v.band}>
      <div className="wrap">
        <h1 className={v.title}>Free courts in Lahore</h1>
        {children ?? <p className={v.sentence}>Padel, futsal, indoor cricket and badminton, with the times still open tonight.</p>}
      </div>
    </section>
  );
}

export function VenueBrowser() {
  useBrowserOnly();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useStore();
  const now = useNow();
  const [resetKey, setResetKey] = useState(0);

  // Venues as their owners describe them, so a renamed venue or new area is searchable.
  const listed = VENUES.map((base) => ({ base, venue: venueWithSettings(state, base) }));
  const areas = [...new Set(listed.map((x) => x.venue.area))].sort();
  const sport = isSport(params.get("sport")) ? (params.get("sport") as Sport) : undefined;
  const area = areas.includes(params.get("area") ?? "") ? params.get("area")! : undefined;
  const q = params.get("q") ?? "";
  const today = operatingNow(now).date;
  const dayOffset = Math.min(6, Math.max(0, Number(params.get("day") ?? 0) || 0));
  const date = addDays(today, dayOffset);
  const when = dayWord(dayOffset, today);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const needle = q.trim().toLowerCase();
  const rows = listed
    .filter(({ venue: x }) => !area || x.area === area)
    .filter(({ venue: x }) => !sport || x.courts.some((c) => c.sport === sport))
    .filter(({ venue: x }) => !needle || `${x.name} ${x.area}`.toLowerCase().includes(needle))
    .map(({ base, venue }: { base: Venue; venue: Venue }) => {
      const bookings = bookingsFor(state, base, date);
      const byHour = new Map<Hour, FreeTime>();
      let freeCount = 0;
      for (const court of venue.courts.filter((c) => !sport || c.sport === sport)) {
        for (const slot of slotsFor(venue, court, bookings, date, now)) {
          if (slot.status !== "free" || !slot.band) continue;
          freeCount++;
          const seen = byHour.get(slot.hour);
          if (!seen || slot.band.price < seen.price) {
            byHour.set(slot.hour, { hour: slot.hour, courtId: court.id, courtName: court.name, price: slot.band.price });
          }
        }
      }
      const times = [...byHour.values()].sort((a, b) => a.hour - b.hour);
      const sports = venueSports(venue).filter((s) => !sport || s === sport);
      const from = Math.min(...sports.map((s) => lowestRate(venue.pricing[s]) ?? Infinity));
      return { venue, times, freeCount, sports, from };
    })
    .sort((a, b) => (b.times.length > 0 ? 1 : 0) - (a.times.length > 0 ? 1 : 0) || (a.times[0]?.hour ?? 99) - (b.times[0]?.hour ?? 99));

  /** Free one-hour slots for a filter combination, for the counts shown in the dropdowns. */
  const countFree = (f: { sport?: Sport; offset: number; area?: string }) => {
    const d = addDays(today, f.offset);
    return listed
      .filter(({ venue: x }) => !f.area || x.area === f.area)
      .filter(({ venue: x }) => !needle || `${x.name} ${x.area}`.toLowerCase().includes(needle))
      .reduce((sum, { base, venue }) => {
        const bookings = bookingsFor(state, base, d);
        return (
          sum +
          venue.courts
            .filter((c) => !f.sport || c.sport === f.sport)
            .reduce((n, c) => n + slotsFor(venue, c, bookings, d, now).filter((s) => s.status === "free").length, 0)
        );
      }, 0);
  };
  const meta = (n: number) => (n ? `${n} free` : "full");

  const sportOptions: PickerOption[] = [undefined, ...SPORTS].map((s) => {
    const n = countFree({ sport: s, offset: dayOffset, area });
    return { value: s ?? "", label: s ? SPORT_LABEL[s].toLowerCase() : "all sports", meta: meta(n), dim: !n };
  });
  const dayOptions: PickerOption[] = Array.from({ length: 7 }, (_, i) => {
    const n = countFree({ sport, offset: i, area });
    return { value: String(i), label: i < 2 ? dayWord(i, today) : `on ${formatDay(addDays(today, i))}`, meta: meta(n), dim: !n };
  });
  const areaOptions: PickerOption[] = [undefined, ...areas].map((a) => {
    const n = countFree({ sport, offset: dayOffset, area: a });
    return { value: a ?? "", label: a ?? "any area", meta: meta(n), dim: !n };
  });
  const filtered = !!(sport || area || q || dayOffset);

  const totalFree = rows.reduce((s, r) => s + r.freeCount, 0);
  const withFree = rows.filter((r) => r.times.length).length;

  return (
    <>
      <BoardHeader>
        <div className={v.sentence}>
          Show me <Picker label="Sport" value={sport ?? ""} options={sportOptions} onChange={(x) => setParam("sport", x || undefined)} />{" "}
          courts <Picker label="Day" value={String(dayOffset)} options={dayOptions} onChange={(x) => setParam("day", x === "0" ? undefined : x)} />{" "}
          in <Picker label="Area" value={area ?? ""} options={areaOptions} onChange={(x) => setParam("area", x || undefined)} />
        </div>
        <div className={v.searchRow}>
          <label className={v.search}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
            <span className="sr-only">Search venues by name</span>
            <input
              key={resetKey}
              type="search"
              defaultValue={q}
              placeholder="Search by venue name"
              onChange={(e) => setParam("q", e.target.value || undefined)}
            />
          </label>
          {filtered && (
            <button
              type="button"
              className={v.clear}
              onClick={() => {
                setResetKey((k) => k + 1);
                router.replace(pathname, { scroll: false });
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </BoardHeader>

      <section className={`wrap ${v.results}`} aria-label="Venues">
        <p className={v.meta} role="status">
          {withFree
            ? `${totalFree} free ${totalFree === 1 ? "slot" : "slots"} at ${withFree} ${withFree === 1 ? "venue" : "venues"} ${when}, earliest first.`
            : `No free slots ${when}${sport ? ` for ${SPORT_LABEL[sport].toLowerCase()}` : ""}.`}
        </p>

        {rows.length === 0 ? (
          <div className={v.empty}>
            <p>No venue matches that search.</p>
            <button type="button" onClick={() => router.replace(pathname, { scroll: false })}>
              Clear the filters
            </button>
          </div>
        ) : (
          <>
            <ul className={v.grid}>
              {rows.map(({ venue, times, sports, from }, index) => {
                const venueHref = `/venues/${venue.slug}${sport ? `?sport=${sport}` : ""}`;
                // One row of four: up to four times, or three plus a "+N" link.
                const shown = times.length > SHOWN_TIMES ? SHOWN_TIMES - 1 : SHOWN_TIMES;
                const extra = times.length - shown;
                return (
                  <li key={venue.id} className={v.card}>
                    <Link href={venueHref} className={v.photo} tabIndex={-1} aria-hidden="true">
                      {venue.photo ? (
                        <Image
                          src={venue.photo.src}
                          alt=""
                          width={1200}
                          height={900}
                          loading={index < 3 ? "eager" : "lazy"}
                          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 400px"
                          unoptimized={venue.photo.src.startsWith("data:")}
                        />
                      ) : (
                        <span className={v.noPhoto} />
                      )}
                      <span className={v.area}>{venue.area}</span>
                    </Link>

                    <div className={v.body}>
                      <h2 className={v.name}>
                        <Link href={venueHref}>{venue.name}</Link>
                      </h2>
                      <p className={v.facts}>
                        {listSports(sports)}. Open {formatHour(venue.openHour)} to {formatHour(venue.closeHour)}.
                      </p>
                      {Number.isFinite(from) && <p className={v.price}>From {formatRupees(from)} an hour</p>}

                      <div className={v.slots}>
                        {times.length ? (
                          <>
                            <p className={v.timesHead}>Free {when}, one hour from</p>
                            <ul className={v.times}>
                              {times.slice(0, shown).map((t) => (
                                <li key={t.hour}>
                                  <Link
                                    className={v.time}
                                    href={`/venues/${venue.slug}/checkout?court=${t.courtId}&date=${date}&start=${t.hour}&hours=1`}
                                    aria-label={`Book ${t.courtName} at ${formatHour(t.hour)} ${when} for ${formatRupees(t.price)}`}
                                  >
                                    <b>{formatHour(t.hour)}</b>
                                    <small>{formatRupees(t.price)}</small>
                                  </Link>
                                </li>
                              ))}
                              {extra > 0 && (
                                <li>
                                  <Link className={v.more} href={venueHref} aria-label={`See ${extra} more free times at ${venue.name}`}>
                                    +{extra}
                                  </Link>
                                </li>
                              )}
                            </ul>
                          </>
                        ) : (
                          <p className={v.full}>
                            Fully booked {when}.{" "}
                            {dayOffset < 6 && (
                              <button type="button" onClick={() => setParam("day", String(dayOffset + 1))}>
                                Try {dayOffset === 0 ? "tomorrow" : weekdayShort(addDays(today, dayOffset + 1))}
                              </button>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {/* Only stock photos carry a credit; a venue's own upload needs none. */}
            {rows.some((r) => r.venue.photo?.credit) && (
              <p className={v.credits}>
                Stock photos:{" "}
                {rows
                  .filter((r) => r.venue.photo?.credit)
                  .map((r, i, arr) => (
                    <span key={r.venue.id}>
                      <a href={r.venue.photo!.creditUrl} target="_blank" rel="noopener noreferrer">
                        {r.venue.photo!.credit}
                      </a>
                      {i < arr.length - 1 ? ", " : "."}
                    </span>
                  ))}
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}
