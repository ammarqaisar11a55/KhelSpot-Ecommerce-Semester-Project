"use client";

import Link from "next/link";
import { useState } from "react";
import ui from "@/components/ui/ui.module.css";
import { venueSports } from "@/lib/catalog/venues";
import { describePolicy } from "@/lib/domain/pricing";
import { formatHour } from "@/lib/domain/time";
import { SPORT_LABEL, type RateBand, type Sport, type VenueSettings } from "@/lib/domain/types";
import { resetDemo, saveVenueSettings } from "@/lib/store/store";
import d from "./dashboard.module.css";
import { useOwnerVenue } from "./useOwnerVenue";

const HOURS = Array.from({ length: 25 }, (_, i) => i + 6); // 6 AM to 6 AM next day

function validate(s: VenueSettings, sports: Sport[]): string[] {
  const problems: string[] = [];
  if (s.closeHour <= s.openHour) problems.push("Closing time must be after opening time.");
  for (const sport of sports) {
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
  }
  return [...new Set(problems)];
}

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

      <div className={d.settingsGrid}>
        <section className={ui.card} aria-labelledby="hours-title">
          <h2 id="hours-title" className={ui.cardTitle}>
            Opening hours
          </h2>
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

        {sports.map((sport) => (
          <section key={sport} className={ui.card} aria-labelledby={`rates-${sport}`}>
            <h2 id={`rates-${sport}`} className={ui.cardTitle}>
              {SPORT_LABEL[sport]} rates, per hour
            </h2>
            {(draft.pricing[sport] ?? []).map((b, i) => (
              <div key={i} className={d.bandRow}>
                <label className={ui.field}>
                  <span>Name</span>
                  <input className={ui.input} value={b.label} onChange={(e) => setBand(sport, i, { label: e.target.value })} />
                </label>
                <label className={ui.field}>
                  <span>From</span>
                  <select className={ui.select} value={b.from} onChange={(e) => setBand(sport, i, { from: Number(e.target.value) })}>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={ui.field}>
                  <span>Until</span>
                  <select className={ui.select} value={b.to} onChange={(e) => setBand(sport, i, { to: Number(e.target.value) })}>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={ui.field}>
                  <span>Price (Rs)</span>
                  <input
                    className={ui.input}
                    type="number"
                    min={0}
                    step={100}
                    inputMode="numeric"
                    value={Number.isFinite(b.price) ? b.price : ""}
                    onChange={(e) => setBand(sport, i, { price: e.target.valueAsNumber })}
                  />
                </label>
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
              </div>
            ))}
            <button type="button" className={ui.btnLight} onClick={() => addBand(sport)}>
              Add a rate
            </button>
          </section>
        ))}

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
          <p className={ui.small} style={{ marginTop: 12 }}>
            Players see: <i>{describePolicy(draft.cancellation)}</i>
          </p>
          <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
            <input
              type="checkbox"
              checked={draft.payAtVenue}
              onChange={(e) => update({ payAtVenue: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            Let players book now and pay cash at the counter
          </label>
        </section>

        {problems.length > 0 && (
          <div className={ui.card} role="alert" style={{ borderColor: "#efc2b5" }}>
            <h2 className={ui.cardTitle}>Fix these before saving</h2>
            <ul className={ui.error} style={{ margin: 0, paddingLeft: 18 }}>
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
          <span className={d.ok} role="status">
            {saved ? "Saved. Players now see the new prices." : ""}
          </span>
          <button
            type="button"
            className={ui.btnDanger}
            style={{ marginLeft: "auto" }}
            onClick={() => {
              if (window.confirm("Clear all demo bookings and settings saved in this browser?")) {
                resetDemo();
                onRestore();
              }
            }}
          >
            Reset demo data
          </button>
        </div>
      </div>
    </>
  );
}
