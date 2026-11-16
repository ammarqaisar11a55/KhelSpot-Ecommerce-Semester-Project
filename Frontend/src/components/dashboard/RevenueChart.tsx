"use client";

import { useState } from "react";
import ui from "@/components/ui/ui.module.css";
import { cx } from "@/lib/format";
import { formatRupees } from "@/lib/domain/pricing";
import { dayOfMonth, formatDay, weekdayShort } from "@/lib/domain/time";
import type { ISODate } from "@/lib/domain/types";
import d from "./dashboard.module.css";

export interface DayRevenue {
  date: ISODate;
  revenue: number;
  bookings: number;
}

/** Nice round top for the y-axis: 1, 2 or 5 × 10^n above the max. */
function niceMax(max: number): number {
  if (max <= 0) return 1000;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= max) return m * pow;
  return 10 * pow;
}

const shortRs = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

export function RevenueChart({ days, today }: { days: DayRevenue[]; today: ISODate }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const top = niceMax(Math.max(...days.map((x) => x.revenue)));
  const total = days.reduce((s, x) => s + x.revenue, 0);

  return (
    <section className={ui.card} aria-labelledby="rev-title">
      <div className={d.cardHead}>
        <h2 id="rev-title" className={ui.cardTitle}>
          Revenue, last {days.length} days
        </h2>
        <button type="button" className={d.linkBtn} onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </div>
      <p className={ui.small} style={{ marginBottom: 14 }}>
        <span className={ui.muted}>Total</span> <b className={ui.mono}>{formatRupees(total)}</b>
        <span className={ui.muted}> · today in dark green</span>
      </p>

      {asTable ? (
        <table className={d.chartTable}>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Bookings</th>
              <th scope="col">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {days.map((x) => (
              <tr key={x.date}>
                <td>{formatDay(x.date)}</td>
                <td>{x.bookings}</td>
                <td>{formatRupees(x.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={d.chart}>
          <div className={d.bars} onMouseLeave={() => setHover(null)}>
            {[0.5, 1].map((f) => (
              <div key={f} className={d.gridLine} style={{ bottom: `${f * 100}%` }} aria-hidden="true">
                <span className={d.gridLabel}>{shortRs(top * f)}</span>
              </div>
            ))}
            {days.map((x, i) => (
              <button
                key={x.date}
                type="button"
                className={d.barHit}
                aria-label={`${formatDay(x.date)}: ${formatRupees(x.revenue)} from ${x.bookings} bookings`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <span
                  className={cx(d.bar, x.date === today && d.barToday)}
                  style={{ height: `${(x.revenue / top) * 100}%` }}
                />
                {hover === i && (
                  <span className={d.tooltip} role="tooltip">
                    {formatDay(x.date)} · {formatRupees(x.revenue)} · {x.bookings} bookings
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className={d.axis} aria-hidden="true">
            {days.map((x, i) => (
              <span key={x.date}>{i % 2 === days.length % 2 ? "" : `${weekdayShort(x.date).slice(0, 2)} ${dayOfMonth(x.date)}`}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
