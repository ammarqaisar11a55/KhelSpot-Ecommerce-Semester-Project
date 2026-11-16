import type { ReactNode } from "react";

const SPORTS: { name: string; body: string; icon: ReactNode }[] = [
  {
    name: "Padel",
    body: "Search interest in Pakistan is now more than ten times its 2023 level.",
    icon: (
      <>
        <circle cx="20" cy="20" r="13" />
        <path d="M29 29l11 11" />
        <circle cx="37" cy="12" r="3" />
      </>
    ),
  },
  {
    name: "Futsal",
    body: "Search interest holds steady all year, with short spikes.",
    icon: (
      <>
        <circle cx="24" cy="24" r="16" />
        <path d="M24 15l7 5-3 8h-8l-3-8z" />
      </>
    ),
  },
  {
    name: "Indoor cricket",
    body: "Peaks every February and March for Ramadan night cricket.",
    icon: (
      <>
        <path d="M30 8l8 8-18 18-8-8z" />
        <path d="M12 34l-4 4" />
        <circle cx="36" cy="36" r="4" />
      </>
    ),
  },
  {
    name: "Badminton",
    body: "“Badminton court near me” searches are up 400%.",
    icon: (
      <>
        <path d="M14 34l14-14" />
        <ellipse cx="33" cy="15" rx="8" ry="6" transform="rotate(-45 33 15)" />
        <path d="M34 34l4 6M34 34l6 2M34 34l2-6" />
      </>
    ),
  },
];

export function Sports() {
  return (
    <section id="sports" className="sports">
      <div className="wrap">
        <p className="eyebrow eyebrow--dark">Every indoor sport</p>
        <h2>Not just padel.</h2>
        <div className="sports__grid">
          {SPORTS.map((s) => (
            <article key={s.name} className="sport">
              <svg viewBox="0 0 48 48" aria-hidden="true">
                {s.icon}
              </svg>
              <h3>{s.name}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
