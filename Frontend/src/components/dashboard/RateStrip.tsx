import type { CSSProperties } from "react";
import { cx } from "@/lib/format";
import { formatRupees } from "@/lib/domain/pricing";
import { formatHour } from "@/lib/domain/time";
import type { RateBand } from "@/lib/domain/types";
import d from "./dashboard.module.css";

interface Run {
  from: number;
  to: number;
  bands: RateBand[];
}

/** Consecutive hours that the same set of rates covers. */
function runs(bands: RateBand[], open: number, close: number): Run[] {
  const result: Run[] = [];
  for (let hour = open; hour < close; hour++) {
    const covering = bands.filter((band) => hour >= band.from && hour < band.to);
    const last = result.at(-1);
    if (last && last.bands.length === covering.length && last.bands.every((band, i) => band === covering[i])) {
      last.to = hour + 1;
    } else {
      result.push({ from: hour, to: hour + 1, bands: covering });
    }
  }
  return result;
}

/**
 * How a sport's rates cover the opening hours, drawn as one strip. Darker
 * green costs more; hatched red hours have no rate or two rates at once.
 */
export function RateStrip({ bands, open, close }: { bands: RateBand[]; open: number; close: number }) {
  if (close <= open) return null;
  const span = close - open;
  const prices = bands.filter((band) => band.price > 0).map((band) => band.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const share = (price: number) => (high > low ? (price - low) / (high - low) : 1);
  const list = runs(bands, open, close);
  const marks = Array.from({ length: Math.floor(span / 2) + 1 }, (_, i) => open + i * 2).filter((h) => h <= close);

  return (
    <figure className={d.strip}>
      <div className={d.stripBar}>
        {list.map((run) => {
          const width = ((run.to - run.from) / span) * 100;
          const style: CSSProperties = { width: `${width}%` };
          if (run.bands.length !== 1) {
            const label = run.bands.length === 0 ? "No rate" : "Two rates";
            return (
              <div
                key={run.from}
                className={cx(d.stripRun, d.stripProblem)}
                style={style}
                title={`${label}, ${formatHour(run.from)} to ${formatHour(run.to)}`}
              >
                <span className={d.stripName}>{label}</span>
              </div>
            );
          }
          const band = run.bands[0];
          const t = band.price > 0 ? share(band.price) : 0;
          style.background = `color-mix(in oklab, var(--turf) ${Math.round(38 + t * 62)}%, var(--chalk))`;
          return (
            <div
              key={run.from}
              className={cx(d.stripRun, t >= 0.84 && d.stripDark)}
              style={style}
              title={`${band.label}, ${formatHour(run.from)} to ${formatHour(run.to)}, ${formatRupees(band.price || 0)} an hour`}
            >
              <span className={d.stripName}>{band.label || "Unnamed"}</span>
              <span className={d.stripPrice}>{band.price > 0 ? formatRupees(band.price) : "No price"}</span>
            </div>
          );
        })}
      </div>
      <div className={d.stripAxis} aria-hidden="true">
        {marks.map((hour) => (
          <span key={hour} style={{ left: `${((hour - open) / span) * 100}%` }}>
            {formatHour(hour)}
          </span>
        ))}
      </div>
      <figcaption className={d.srOnly}>
        {list
          .map((run) =>
            run.bands.length === 1
              ? `${run.bands[0].label} from ${formatHour(run.from)} to ${formatHour(run.to)}`
              : `${run.bands.length === 0 ? "no rate" : "two rates"} from ${formatHour(run.from)} to ${formatHour(run.to)}`,
          )
          .join("; ")}
      </figcaption>
    </figure>
  );
}
