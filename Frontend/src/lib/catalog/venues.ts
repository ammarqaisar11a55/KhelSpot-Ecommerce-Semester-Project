// Sample venues for the demo. Names and details are made up.
// Rates follow the time-band pricing seen in venue ads in the proposal (Section C).

import type { CancellationPolicy, RateBand, Sport, Venue } from "@/lib/domain/types";

const nightBands = (off: number, peak: number, late: number): RateBand[] => [
  { from: 16, to: 19, price: off, label: "Off-peak" },
  { from: 19, to: 26, price: peak, label: "Peak" },
  { from: 26, to: 28, price: late, label: "Late" },
];

const dayBands = (day: number, evening: number): RateBand[] => [
  { from: 8, to: 17, price: day, label: "Daytime" },
  { from: 17, to: 24, price: evening, label: "Evening" },
];

const STANDARD: CancellationPolicy = { freeUntilHours: 6, lateRefundPercent: 50 };
const STRICT: CancellationPolicy = { freeUntilHours: 12, lateRefundPercent: 0 };

const PADEL = nightBands(4000, 6000, 5000);
const FUTSAL = nightBands(3000, 4500, 3500);
const CRICKET = nightBands(2500, 3500, 3000);

export const VENUES: Venue[] = [
  {
    id: "v-night-owl",
    slug: "night-owl-arena-johar-town",
    name: "Night Owl Arena",
    city: "Lahore",
    area: "Johar Town",
    address: "Block G1, Johar Town, Lahore",
    description: "Two futsal pitches and an indoor cricket ground under full floodlights, open until 4 AM.",
    courts: [
      { id: "no-f1", name: "Futsal Pitch 1", sport: "futsal" },
      { id: "no-f2", name: "Futsal Pitch 2", sport: "futsal" },
      { id: "no-c1", name: "Cricket Ground", sport: "cricket" },
    ],
    amenities: ["Floodlights", "Parking", "Changing rooms", "Drinking water"],
    openHour: 16,
    closeHour: 28,
    pricing: { futsal: FUTSAL, cricket: CRICKET },
    cancellation: STANDARD,
    payAtVenue: true,
  },
  {
    id: "v-baseline",
    slug: "baseline-padel-club-dha",
    name: "Baseline Padel Club",
    city: "Lahore",
    area: "DHA Phase 6",
    address: "Main Boulevard, DHA Phase 6, Lahore",
    description: "Three glass-walled padel courts with racket rental and a small café.",
    courts: [
      { id: "bp-1", name: "Court 1", sport: "padel" },
      { id: "bp-2", name: "Court 2", sport: "padel" },
      { id: "bp-3", name: "Court 3", sport: "padel" },
    ],
    amenities: ["Racket rental", "Café", "Parking", "Changing rooms"],
    openHour: 16,
    closeHour: 28,
    pricing: { padel: PADEL },
    cancellation: STANDARD,
    payAtVenue: false,
  },
  {
    id: "v-crease",
    slug: "crease-indoor-cricket-gulberg",
    name: "Crease Indoor Cricket",
    city: "Lahore",
    area: "Gulberg III",
    address: "Off MM Alam Road, Gulberg III, Lahore",
    description: "Two netted indoor cricket grounds with tape-ball and hard-ball sessions.",
    courts: [
      { id: "cr-1", name: "Ground A", sport: "cricket" },
      { id: "cr-2", name: "Ground B", sport: "cricket" },
    ],
    amenities: ["Floodlights", "Bats and balls", "Scoreboard", "Parking"],
    openHour: 16,
    closeHour: 28,
    pricing: { cricket: nightBands(2500, 3500, 3000) },
    cancellation: STANDARD,
    payAtVenue: true,
  },
  {
    id: "v-shuttle-house",
    slug: "shuttle-house-model-town",
    name: "Shuttle House",
    city: "Lahore",
    area: "Model Town",
    address: "Link Road, Model Town, Lahore",
    description: "Four wooden-floor badminton courts, open from the morning.",
    courts: [
      { id: "sh-1", name: "Court 1", sport: "badminton" },
      { id: "sh-2", name: "Court 2", sport: "badminton" },
      { id: "sh-3", name: "Court 3", sport: "badminton" },
      { id: "sh-4", name: "Court 4", sport: "badminton" },
    ],
    amenities: ["Wooden floor", "Shuttle sales", "Drinking water"],
    openHour: 8,
    closeHour: 24,
    pricing: { badminton: dayBands(1200, 1800) },
    cancellation: STANDARD,
    payAtVenue: true,
  },
  {
    id: "v-harbour",
    slug: "harbour-padel-dha-karachi",
    name: "Harbour Padel",
    city: "Karachi",
    area: "DHA Phase 8",
    address: "Khayaban-e-Ittehad, DHA Phase 8, Karachi",
    description: "Two padel courts near the sea front, with coaching on weekday evenings.",
    courts: [
      { id: "hp-1", name: "Court 1", sport: "padel" },
      { id: "hp-2", name: "Court 2", sport: "padel" },
    ],
    amenities: ["Coaching", "Racket rental", "Parking"],
    openHour: 16,
    closeHour: 28,
    pricing: { padel: nightBands(4500, 6500, 5500) },
    cancellation: STRICT,
    payAtVenue: false,
  },
  {
    id: "v-gulshan-hub",
    slug: "gulshan-sports-hub",
    name: "Gulshan Sports Hub",
    city: "Karachi",
    area: "Gulshan-e-Iqbal",
    address: "Block 13-D, Gulshan-e-Iqbal, Karachi",
    description: "A futsal pitch, an indoor cricket ground and two badminton courts under one roof.",
    courts: [
      { id: "gs-f1", name: "Futsal Pitch", sport: "futsal" },
      { id: "gs-c1", name: "Cricket Ground", sport: "cricket" },
      { id: "gs-b1", name: "Badminton 1", sport: "badminton" },
      { id: "gs-b2", name: "Badminton 2", sport: "badminton" },
    ],
    amenities: ["Floodlights", "Parking", "Café"],
    openHour: 16,
    closeHour: 28,
    pricing: { futsal: FUTSAL, cricket: CRICKET, badminton: nightBands(1200, 1800, 1500) },
    cancellation: STANDARD,
    payAtVenue: true,
  },
  {
    id: "v-margalla",
    slug: "margalla-courts-f11",
    name: "Margalla Courts",
    city: "Islamabad",
    area: "F-11",
    address: "F-11 Markaz, Islamabad",
    description: "Padel and badminton with a view of the hills, open from the afternoon.",
    courts: [
      { id: "mc-p1", name: "Padel 1", sport: "padel" },
      { id: "mc-p2", name: "Padel 2", sport: "padel" },
      { id: "mc-b1", name: "Badminton 1", sport: "badminton" },
    ],
    amenities: ["Racket rental", "Parking", "Changing rooms"],
    openHour: 16,
    closeHour: 26,
    pricing: {
      padel: nightBands(3500, 5000, 4000).map((b) => (b.label === "Late" ? { ...b, to: 26 } : b)),
      badminton: nightBands(1000, 1500, 1200).map((b) => (b.label === "Late" ? { ...b, to: 26 } : b)),
    },
    cancellation: STANDARD,
    payAtVenue: true,
  },
  {
    id: "v-capital-dome",
    slug: "capital-cricket-dome-g13",
    name: "Capital Cricket Dome",
    city: "Islamabad",
    area: "G-13",
    address: "G-13/1, Islamabad",
    description: "A full-size indoor cricket dome and a futsal pitch, busiest in Ramadan.",
    courts: [
      { id: "cd-c1", name: "Cricket Dome", sport: "cricket" },
      { id: "cd-f1", name: "Futsal Pitch", sport: "futsal" },
    ],
    amenities: ["Floodlights", "Bowling machine", "Parking"],
    openHour: 16,
    closeHour: 28,
    pricing: { cricket: nightBands(3000, 3500, 3200), futsal: FUTSAL },
    cancellation: STANDARD,
    payAtVenue: true,
  },
];

/** The venue the owner dashboard is signed in as, until accounts exist. */
export const DEMO_OWNER_VENUE_ID = "v-night-owl";

export function getVenueBySlug(slug: string): Venue | undefined {
  return VENUES.find((v) => v.slug === slug);
}

export function getVenueById(id: string): Venue | undefined {
  return VENUES.find((v) => v.id === id);
}

export function venueSports(venue: Pick<Venue, "courts">): Sport[] {
  return [...new Set(venue.courts.map((c) => c.sport))];
}
