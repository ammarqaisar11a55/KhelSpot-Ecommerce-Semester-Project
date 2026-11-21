"use client";

// "Why now" chart: padel search interest in Pakistan, redrawn from Google Trends.
// One series, so no legend: the title names it. The plot is one target: a pointer,
// tap or arrow key snaps the crosshair to the nearest month we have a reading for.
// Text is HTML laid over the SVG so it stays crisp and legible at every width.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

// Approximate points from the Google Trends chart in the proposal (Figure 1).
// m: months since Oct 2021, v: interest (100 = the busiest month).
const DATA: ReadonlyArray<readonly [m: number, v: number]> = [
  [0, 3], [12, 3], [24, 5], [33, 15], [38, 30], [41, 92],
  [44, 55], [49, 68], [53, 100], [56, 66], [60, 60],
];
const SPAN = 60;
const W = 600;
const H = 200;
const PEAK = DATA.reduce((best, d, i) => (d[1] > DATA[best][1] ? i : best), 0);
const LAST = DATA.length - 1;
const BEFORE = DATA.findIndex(([m]) => m === 24); // Oct 2023, two years before the latest reading
const YEARS = [2022, 2023, 2024, 2025, 2026].map((y) => ({ y, m: (y - 2021) * 12 - 9 })); // January of each year

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const month = (m: number, names = SHORT) => {
  const t = 2021 * 12 + 9 + m;
  return `${names[t % 12]} ${Math.floor(t / 12)}`;
};

const px = (m: number) => (m / SPAN) * W;
const py = (v: number) => H - (v / 100) * H;
const pct = (m: number) => `${(m / SPAN) * 100}%`;
const pctY = (v: number) => `${100 - v}%`;

/** Monotone cubic (Fritsch–Carlson): smooth, but never overshoots a reading. */
function monotone(points: ReadonlyArray<readonly [number, number]>) {
  const p = points.map(([m, v]) => [px(m), py(v)] as const);
  const n = p.length;
  const slope = (i: number) => (p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0]);
  const t = p.map((_, i) => {
    if (i === 0) return slope(0);
    if (i === n - 1) return slope(n - 2);
    const s0 = slope(i - 1);
    const s1 = slope(i);
    if (s0 * s1 <= 0) return 0;
    const h0 = p[i][0] - p[i - 1][0];
    const h1 = p[i + 1][0] - p[i][0];
    const mid = (s0 * h1 + s1 * h0) / (h0 + h1);
    return Math.sign(s0) * Math.min(Math.abs(s0), Math.abs(s1), Math.abs(mid) / 2) * 2;
  });
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = (p[i + 1][0] - p[i][0]) / 3;
    d += `C${p[i][0] + h},${p[i][1] + t[i] * h} ${p[i + 1][0] - h},${p[i + 1][1] - t[i + 1] * h} ${p[i + 1][0]},${p[i + 1][1]}`;
  }
  return d;
}

const LINE = monotone(DATA);
const AREA = `${LINE}L${W},${H}L0,${H}Z`;

export function TrendChart() {
  const id = useId();
  const fig = useRef<HTMLElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [shown, setShown] = useState(false);

  // Draw the line in once the chart scrolls into view.
  useEffect(() => {
    const el = fig.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pick = (clientX: number) => {
    const r = plot.current?.getBoundingClientRect();
    if (!r) return;
    const m = ((clientX - r.left) / r.width) * SPAN;
    let best = 0;
    DATA.forEach(([dm], i) => {
      if (Math.abs(dm - m) < Math.abs(DATA[best][0] - m)) best = i;
    });
    setActive(best);
  };

  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, (i: number) => number> = {
      ArrowRight: (i) => Math.min(LAST, i + 1),
      ArrowLeft: (i) => Math.max(0, i - 1),
      Home: () => 0,
      End: () => LAST,
    };
    if (moves[e.key]) {
      e.preventDefault();
      setActive((i) => moves[e.key](i ?? LAST));
    } else if (e.key === "Escape") setActive(null);
  };

  const a = active !== null ? DATA[active] : null;
  const [lastM, lastV] = DATA[LAST];
  const [peakM, peakV] = DATA[PEAK];

  return (
    <figure ref={fig} className="trend" data-in={shown || undefined}>
      <figcaption className="trend__head">
        <span className="trend__titles">
          <span className="trend__kicker">Google Trends · Pakistan</span>
          <span className="trend__title" id={`${id}-t`}>
            Search interest in &ldquo;padel&rdquo;
          </span>
        </span>
        <span className="trend__hero">
          <span className="trend__num">
            {lastV}
            <span className="trend__of">/100</span>
          </span>
          <span className="trend__sub">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="trend__up">
              <path d="M2 11.5l4-4 3 3 5-5.5M10 5h4v4" />
            </svg>
            {month(lastM)}, up from {DATA[BEFORE][1]} in {month(DATA[BEFORE][0])}
          </span>
        </span>
      </figcaption>

      <div className="trend__frame">
        <div className="trend__y" aria-hidden="true">
          {[100, 50, 0].map((v) => (
            <span key={v} style={{ top: pctY(v) }}>
              {v}
            </span>
          ))}
        </div>

        <div
          ref={plot}
          className="trend__plot"
          tabIndex={0}
          role="group"
          aria-labelledby={`${id}-t`}
          aria-describedby={`${id}-d`}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((i) => i ?? LAST)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
        >
          <svg className="trend__grid" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            {[100, 50].map((v) => (
              <line key={v} x1="0" x2={W} y1={py(v)} y2={py(v)} />
            ))}
            <line className="trend__base" x1="0" x2={W} y1={H} y2={H} />
            {YEARS.map(({ y, m }) => (
              <line key={y} className="trend__tick" x1={px(m)} x2={px(m)} y1={H} y2={H + 6} />
            ))}
          </svg>
          <svg className="trend__ink" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--flood)" stopOpacity="0.2" />
                <stop offset="1" stopColor="var(--flood)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={AREA} fill={`url(#${id}-g)`} />
            <path d={LINE} className="trend__line" />
          </svg>

          <span className="trend__dot" style={{ left: pct(lastM), top: pctY(lastV) }} aria-hidden="true" />
          <span className="trend__dot trend__dot--peak" style={{ left: pct(peakM), top: pctY(peakV) }} aria-hidden="true" />
          <span
            className="trend__peak"
            style={{ left: pct(peakM), top: pctY(peakV) }}
            data-hide={a ? "" : undefined}
            aria-hidden="true"
          >
            <b>{peakV}</b> Peak, {month(peakM)}
          </span>

          {a && (
            <>
              <span className="trend__cross" style={{ left: pct(a[0]) }} aria-hidden="true" />
              <span className="trend__dot trend__dot--active" style={{ left: pct(a[0]), top: pctY(a[1]) }} aria-hidden="true" />
              <span
                className="trend__tip"
                style={{ left: pct(a[0]) }}
                data-side={a[0] > SPAN * 0.55 ? "left" : "right"}
                aria-hidden="true"
              >
                <b>{a[1]}</b>
                <span>{month(a[0])}</span>
              </span>
            </>
          )}
        </div>

        <div className="trend__x" aria-hidden="true">
          {YEARS.map(({ y, m }) => (
            <span key={y} style={{ left: pct(m) }}>
              {y}
            </span>
          ))}
        </div>
      </div>

      <p className="sr-only" id={`${id}-d`}>
        Line chart. Near zero from 2021 to 2023, rising through 2024, a first spike to 92 in March 2025, a peak of 100 in
        March 2026, and {lastV} in {month(lastM, LONG)}. Left and right arrows read each month.
      </p>
      <p className="sr-only" aria-live="polite">
        {a ? `${month(a[0], LONG)}: ${a[1]} out of 100` : ""}
      </p>
      <table className="sr-only">
        <caption>Search interest in padel, Pakistan, 100 = busiest month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Interest</th>
          </tr>
        </thead>
        <tbody>
          {DATA.map(([m, v]) => (
            <tr key={m}>
              <td>{month(m, LONG)}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="trend__note">
        Redrawn from Google Trends, Oct 2021 to Oct 2026. 100 is the busiest month; values are approximate.
      </p>
    </figure>
  );
}
