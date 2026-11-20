// Sample venues for the demo, Lahore only for launch. Names and details are made up;
// photos are free Unsplash stock (credited) until venues upload their own.
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

const PADEL = nightBands(4000, 6000, 5000);
const FUTSAL = nightBands(3000, 4500, 3500);
const CRICKET = nightBands(2500, 3500, 3000);

export const VENUES: Venue[] = [
  {
    id: "v-night-owl",
    slug: "night-owl-arena-johar-town",
    photo: {
      src: "/venues/night-owl-arena-johar-town.jpg",
      alt: "An indoor futsal match under arena lights",
      credit: "Alfonso Scarpa on Unsplash",
      creditUrl: "https://unsplash.com/photos/f44zfM0Vn8w",
    },
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
    photo: {
      src: "/venues/baseline-padel-club-dha.jpg",
      alt: "Padel courts seen from above, with glass walls and fencing",
      credit: "José Alejandro Cuffia on Unsplash",
      creditUrl: "https://unsplash.com/photos/NtiZoP2CKOs",
    },
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
    photo: {
      src: "/venues/crease-indoor-cricket-gulberg.jpg",
      alt: "A netted indoor cricket hall",
      credit: "Diego González on Unsplash",
      creditUrl: "https://unsplash.com/photos/kfNcWiV17lI",
    },
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
    photo: {
      src: "/venues/shuttle-house-model-town.jpg",
      alt: "A player jumping for a smash on an indoor badminton court",
      credit: "Muktasim Azlan on Unsplash",
      creditUrl: "https://unsplash.com/photos/rjWfNR_AC5g",
    },
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
  },];

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
