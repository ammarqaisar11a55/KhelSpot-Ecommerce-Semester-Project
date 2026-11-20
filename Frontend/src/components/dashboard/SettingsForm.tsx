"use client";

import Link from "next/link";
import { useState } from "react";
import ui from "@/components/ui/ui.module.css";
import { venueSports } from "@/lib/catalog/venues";
import { describePolicy, formatRupees } from "@/lib/domain/pricing";
import { formatHour } from "@/lib/domain/time";
import { SPORT_LABEL, type RateBand, type Sport, type VenueSettings } from "@/lib/domain/types";
import { resetDemo, saveVenueSettings } from "@/lib/store/store";
import d from "./dashboard.module.css";
import { RateStrip } from "./RateStrip";
import { useOwnerVenue } from "./useOwnerVenue";

const HOURS = Array.from({ length: 25 }, (_, i) => i + 6); // 6 AM to 6 AM next day

function sportProblems(s: VenueSettings, sport: Sport): string[] {
  const problems: string[] = [];
  const bands = [...(s.pricing[sport] ?? [])].sort((a, b) => a.from - b.from);
  if (!bands.length) problems.push(`${SPORT_LABEL[sport]} needs at least one rate.`);
  bands.forEach((b, i) => {
    if (!b.label.trim()) problems.push(`${SPORT_LABEL[sport]}: every rate needs a name.`);
    if (b.to <= b.from) problems.push(`${SPORT_LABEL[sport]} "${b.label}": the end must be after the start.`);
    if (!(b.price > 0)) problems.push(`${SPORT_LABEL[sport]} "${b.label}": add a price above zero.`);
    if (i > 0 && b.from < bands[i - 1].to) problems.push(`${SPORT_LABEL[sport]}: "${bands[i - 1].label}" and "${b.label}" overlap.`);
  });
  const covered = (h: number) => bands.some((b) => h >= b.from && h < b.to);
  const gaps = [];
  for (let h = s.openHour; h < s.closeHour; h++) if (!covered(h)) gaps.push(formatHour(h));
  if (gaps.length) problems.push(`${SPORT_LABEL[sport]} has no rate at ${gaps.join(", ")}, so those hours can't be booked.`);
  return [...new Set(problems)];
}

function validate(s: VenueSettings, sports: Sport[]): string[] {
  const problems: string[] = [];
  if (s.closeHour <= s.openHour) problems.push("Closing time must be after opening time.");
  for (const sport of sports) problems.push(...sportProblems(s, sport));
  return [...new Set(problems)];
}

const settingsOf = (v: VenueSettings): VenueSettings => ({
  openHour: v.openHour,
  closeHour: v.closeHour,
  pricing: v.pricing,
  cancellation: v.cancellation,
  payAtVenue: v.payAtVenue,
});

export function SettingsForm() {
  const { venue, base } = useOwnerVenue();
  const sports = venueSports(venue);
  const [draft, setDraft] = useState<VenueSettings>(() => ({
    openHour: venue.openHour,
    closeHour: venue.closeHour,
    pricing: structuredClone(venue.pricing),
    cancellation: { ...venue.cancellation },
    payAtVenue: venue.payAtVenue,
  }));
  const [saved, setSaved] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  const update = (patch: Partial<VenueSettings>) => {
    setDraft((cur) => ({ ...cur, ...patch }));
    setSaved(false);
  };

  const setBand = (sport: Sport, i: number, patch: Partial<RateBand>) => {
    const bands = [...(draft.pricing[sport] ?? [])];
    bands[i] = { ...bands[i], ...patch };
    update({ pricing: { ...draft.pricing, [sport]: bands } });
  };

  const removeBand = (sport: Sport, i: number) => {
    const bands = (draft.pricing[sport] ?? []).filter((_, j) => j !== i);
    update({ pricing: { ...draft.pricing, [sport]: bands } });
  };

  const addBand = (sport: Sport) => {
    const bands = draft.pricing[sport] ?? [];
    const from = bands.length ? Math.max(...bands.map((b) => b.to)) : draft.openHour;
    update({
      pricing: {
        ...draft.pricing,
        [sport]: [...bands, { label: "New rate", from, to: Math.min(from + 2, draft.closeHour), price: bands.at(-1)?.price ?? 3000 }],
      },
    });
  };

  const onSave = () => {
    const found = validate(draft, sports);
    setProblems(found);
    if (found.length) return;
    const pricing = Object.fromEntries(
      Object.entries(draft.pricing).map(([sp, bands]) => [sp, [...(bands ?? [])].sort((a, b) => a.from - b.from)]),
    );
    saveVenueSettings(venue.id, { ...draft, pricing });
    setSaved(true);
  };

  const onRestore = () => {
    setDraft({
      openHour: base.openHour,
      closeHour: base.closeHour,
      pricing: structuredClone(base.pricing),
      cancellation: { ...base.cancellation },
      payAtVenue: base.payAtVenue,
    });
    setProblems([]);
    setSaved(false);
  };

  const dirty = JSON.stringify(settingsOf(draft)) !== JSON.stringify(settingsOf(venue));
  const openFor = draft.closeHour - draft.openHour;

  return (
    <>
      <div className={ui.pageHead}>
        <div>
          <h1 className={ui.title}>Prices and rules</h1>
          <p className={ui.subtitle}>
            Changes show on <Link href={`/venues/${venue.slug}`}>your public page</Link> as soon as you save. Existing
            bookings keep the price they were booked at.
          </p>
        </div>
      </div>

      <div className={d.rulesLayout}>
        <div className={d.rulesMain}>
          <section className={ui.card} aria-labelledby="hours-title">
            <div className={d.cardHead}>
              <h2 id="hours-title" className={ui.cardTitle}>
                Opening hours
              </h2>
              <span className={ui.small}>
                {openFor > 0 ? `Open ${openFor} ${openFor === 1 ? "hour" : "hours"} a day` : "Closing must come after opening"}
              </span>
            </div>
            <div className={d.formRow}>
              <label className={ui.field}>
                <span>Opens</span>
                <select className={ui.select} value={draft.openHour} onChange={(e) => update({ openHour: Number(e.target.value) })}>
                  {HOURS.slice(0, -1).map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={ui.field}>
                <span>Closes</span>
                <select className={ui.select} value={draft.closeHour} onChange={(e) => update({ closeHour: Number(e.target.value) })}>
                  {HOURS.slice(1).map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                      {h >= 24 ? " (next day)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {sports.map((sport) => {
            const bands = draft.pricing[sport] ?? [];
            const issues = draft.closeHour > draft.openHour ? sportProblems(draft, sport) : [];
            return (
              <section key={sport} className={ui.card} aria-labelledby={`rates-${sport}`}>
                <div className={d.cardHead}>
                  <h2 id={`rates-${sport}`} className={ui.cardTitle}>
                    {SPORT_LABEL[sport]} rates
                  </h2>
                  <span className={ui.small}>Per court, per hour</span>
                </div>

                <RateStrip bands={bands} open={draft.openHour} close={draft.closeHour} />
                {issues.length > 0 && (
                  <ul className={d.stripIssues}>
                    {issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}

                {bands.length > 0 && (
                  <table className={d.rateTable}>
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">From</th>
                        <th scope="col">Until</th>
                        <th scope="col">Rs an hour</th>
                        <th scope="col">
                          <span className={d.srOnly}>Remove</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bands.map((b, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              className={ui.input}
                              aria-label="Rate name"
                              value={b.label}
                              onChange={(e) => setBand(sport, i, { label: e.target.value })}
                            />
                          </td>
                          <td>
                            <select
                              className={ui.select}
                              aria-label={`${b.label || "Rate"} starts`}
                              value={b.from}
                              onChange={(e) => setBand(sport, i, { from: Number(e.target.value) })}
                            >
                              {HOURS.map((h) => (
                                <option key={h} value={h}>
                                  {formatHour(h)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className={ui.select}
                              aria-label={`${b.label || "Rate"} ends`}
                              value={b.to}
                              onChange={(e) => setBand(sport, i, { to: Number(e.target.value) })}
                            >
                              {HOURS.map((h) => (
                                <option key={h} value={h}>
                                  {formatHour(h)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className={d.priceField}>
                              <span aria-hidden="true">Rs</span>
                              <input
                                className={ui.input}
                                aria-label={`${b.label || "Rate"} price in rupees`}
                                type="number"
                                min={0}
                                step={100}
                                inputMode="numeric"
                                value={Number.isFinite(b.price) ? b.price : ""}
                                onChange={(e) => setBand(sport, i, { price: e.target.valueAsNumber })}
                              />
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={ui.iconBtn}
                              aria-label={`Remove ${b.label} rate`}
                              onClick={() => removeBand(sport, i)}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <button type="button" className={`${ui.btnLight} ${d.addRate}`} onClick={() => addBand(sport)}>
                  Add a rate
                </button>
              </section>
            );
          })}

          <section className={ui.card} aria-labelledby="cancel-title">
            <h2 id="cancel-title" className={ui.cardTitle}>
              Cancellation and payment
            </h2>
            <div className={d.formRow}>
              <label className={ui.field}>
                <span>Free cancellation until</span>
                <select
                  className={ui.select}
                  value={draft.cancellation.freeUntilHours}
                  onChange={(e) => update({ cancellation: { ...draft.cancellation, freeUntilHours: Number(e.target.value) } })}
                >
                  {[2, 4, 6, 12, 24, 48].map((h) => (
                    <option key={h} value={h}>
                      {h} hours before
                    </option>
                  ))}
                </select>
              </label>
              <label className={ui.field}>
                <span>Refund after that</span>
                <select
                  className={ui.select}
                  value={draft.cancellation.lateRefundPercent}
                  onChange={(e) => update({ cancellation: { ...draft.cancellation, lateRefundPercent: Number(e.target.value) } })}
                >
                  {[0, 25, 50, 75].map((p) => (
                    <option key={p} value={p}>
                      {p}%
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={d.checkRow}>
              <input type="checkbox" checked={draft.payAtVenue} onChange={(e) => update({ payAtVenue: e.target.checked })} />
              <span>
                Let players book now and pay cash at the counter
                <span className={ui.hint}>Their booking shows as unpaid until you mark the cash as collected.</span>
              </span>
            </label>
          </section>

          {problems.length > 0 && (
            <div className={d.problems} role="alert">
              <h2 className={ui.cardTitle}>Fix these before saving</h2>
              <ul>
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={d.saveBar}>
            <button type="button" className="btn btn--accent" onClick={onSave}>
              Save changes
            </button>
            <button type="button" className={ui.btnLight} onClick={onRestore}>
              Restore original prices
            </button>
            <span className={dirty ? d.unsaved : d.ok} role="status">
              {saved && !dirty ? "Saved. Players now see the new prices." : dirty ? "Unsaved changes" : ""}
            </span>
          </div>
        </div>

        <aside className={d.rulesAside} aria-labelledby="players-title">
          <section className={d.preview}>
            <h2 id="players-title" className={ui.cardTitle}>
              What players see
            </h2>
            <p className={ui.small}>
              Open {formatHour(draft.openHour)} to {formatHour(draft.closeHour)}
            </p>
            {sports.map((sport) => (
              <div key={sport} className={d.previewSport}>
                <h3>Rates for {SPORT_LABEL[sport].toLowerCase()}</h3>
                <dl>
                  {[...(draft.pricing[sport] ?? [])]
                    .sort((a, b) => a.from - b.from)
                    .map((b, i) => (
                      <div key={i}>
                        <dt>
                          {b.label || "Unnamed"}, {formatHour(b.from)} to {formatHour(b.to)}
                        </dt>
                        <dd>{b.price > 0 ? `${formatRupees(b.price)}/hr` : "No price"}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            ))}
            <div className={d.previewSport}>
              <h3>Cancelling</h3>
              <p>{describePolicy(draft.cancellation)}</p>
              {draft.payAtVenue && <p>You can also pay cash at the venue.</p>}
            </div>
          </section>

          <section className={d.demoBox} aria-labelledby="demo-title">
            <h2 id="demo-title">Demo data</h2>
            <p>Clears the sample bookings and every setting saved in this browser.</p>
            <button
              type="button"
              className={ui.btnDanger}
              onClick={() => {
                if (window.confirm("Clear all demo bookings and settings saved in this browser?")) {
                  resetDemo();
                  onRestore();
                }
              }}
            >
              Reset demo data
            </button>
          </section>
        </aside>
      </div>
    </>
  );
}
