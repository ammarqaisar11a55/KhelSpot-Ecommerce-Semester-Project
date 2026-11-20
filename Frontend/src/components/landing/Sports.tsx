import Image from "next/image";
import Link from "next/link";
import type { Sport } from "@/lib/domain/types";

const SPORTS: { sport: Sport; name: string; stat: string; statLabel: string; body: string; photo: string; alt: string }[] = [
  {
    sport: "padel",
    name: "Padel",
    stat: "10x",
    statLabel: "search interest since 2023",
    body: "Search interest in Pakistan is now more than ten times its 2023 level.",
    photo: "/venues/baseline-padel-club-dha.jpg",
    alt: "Padel courts seen from above",
  },
  {
    sport: "futsal",
    name: "Futsal",
    stat: "All year",
    statLabel: "steady demand",
    body: "Search interest holds steady all year, with only short spikes.",
    photo: "/venues/night-owl-arena-johar-town.jpg",
    alt: "An indoor futsal match under arena lights",
  },
  {
    sport: "cricket",
    name: "Indoor cricket",
    stat: "Feb–Mar",
    statLabel: "Ramadan night season",
    body: "Peaks every February and March, when night cricket fills the indoor grounds.",
    photo: "/venues/crease-indoor-cricket-gulberg.jpg",
    alt: "A netted indoor cricket hall",
  },
  {
    sport: "badminton",
    name: "Badminton",
    stat: "+400%",
    statLabel: "“court near me” searches",
    body: "More people are searching for a badminton court near them than ever before.",
    photo: "/venues/shuttle-house-model-town.jpg",
    alt: "A player jumping for a smash on an indoor badminton court",
  },
];

export function Sports() {
  return (
    <section id="sports" className="sports">
      <div className="wrap">
        <p className="eyebrow eyebrow--dark">Every indoor sport</p>
        <h2>Not just padel.</h2>
      </div>
      <ul className="sports__grid wrap" aria-label="Sports you can book">
        {SPORTS.map((s) => (
          <li key={s.sport}>
            <Link href={`/venues?sport=${s.sport}`} className="sportTile">
              <Image
                src={s.photo}
                alt={s.alt}
                fill
                sizes="(max-width: 640px) 88vw, (max-width: 900px) 100vw, 600px"
                className="sportTile__img"
              />
              <span className="sportTile__chip glass">
                <b>{s.stat}</b>
                <small>{s.statLabel}</small>
              </span>
              <span className="sportTile__panel glass">
                <span className="sportTile__name">{s.name}</span>
                <span className="sportTile__body">{s.body}</span>
                <span className="sportTile__cta">See {s.name.toLowerCase()} courts</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
