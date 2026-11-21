import { TrendChart } from "./TrendChart";

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
        <TrendChart />
      </div>
    </section>
  );
}
