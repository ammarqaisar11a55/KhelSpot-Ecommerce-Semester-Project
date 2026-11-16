// Approximate points redrawn from the Google Trends chart in the proposal (Figure 1).
// x: months since Oct 2021 (0–60), v: interest (0–100).
const PADEL_TREND = [
  [0, 3], [12, 3], [24, 5], [33, 15], [38, 30], [41, 92],
  [44, 55], [49, 68], [53, 100], [56, 66], [60, 60],
] as const;

const X0 = 20;
const X1 = 580;
const Y_BASE = 190;
const Y_SCALE = 1.6;
const toX = (m: number) => Math.round(X0 + (m / 60) * (X1 - X0));
const toY = (v: number) => Math.round(Y_BASE - v * Y_SCALE);
const POINTS = PADEL_TREND.map(([m, v]) => `${toX(m)},${toY(v)}`).join(" ");
const PEAK = { x: toX(53), y: toY(100) };

const STATS = [
  { value: "10x", label: "padel search interest compared with 2023" },
  {
    value: "1K–10K",
    label: "monthly searches each for “padel court”, “padel courts near me” and “badminton court near me”",
  },
  { value: "+300%", label: "growth in “sports complex near me”" },
];

export function Demand() {
  return (
    <section className="demand">
      <div className="wrap demand__grid">
        <div>
          <p className="eyebrow">Why now</p>
          <h2>People are already searching for a court near them.</h2>
          <dl className="stats">
            {STATS.map((s) => (
              <div key={s.value}>
                <dt>{s.value}</dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>
          <p className="source">Sources: Google Trends and Google Keyword Planner, Pakistan, October 2026.</p>
        </div>
        <figure className="chart">
          <figcaption>Search interest in &ldquo;padel&rdquo;, Pakistan (0–100)</figcaption>
          <svg
            viewBox="0 0 600 220"
            role="img"
            aria-label="Line chart: padel search interest near zero from 2021 to 2023, rising in 2024, reaching 92 in March 2025, peaking at 100 in March 2026 and holding around 60 in October 2026."
          >
            <g className="chart__grid">
              <line x1={X0} y1={toY(100)} x2={X1} y2={toY(100)} />
              <line x1={X0} y1={toY(50)} x2={X1} y2={toY(50)} />
              <line x1={X0} y1={Y_BASE} x2={X1} y2={Y_BASE} />
            </g>
            <polyline className="chart__line" points={POINTS} />
            <circle className="chart__peak" cx={PEAK.x} cy={PEAK.y} r="6" />
            <text x={PEAK.x - 14} y={PEAK.y - 10} textAnchor="end" className="chart__label">
              100 · Mar 2026
            </text>
            <text x={X0} y="212" className="chart__axis">
              Oct 2021
            </text>
            <text x={toX(24)} y="212" className="chart__axis" textAnchor="middle">
              2023
            </text>
            <text x={X1} y="212" className="chart__axis" textAnchor="end">
              Oct 2026
            </text>
          </svg>
          <p className="chart__note">Redrawn from Google Trends. Values are approximate.</p>
        </figure>
      </div>
    </section>
  );
}
