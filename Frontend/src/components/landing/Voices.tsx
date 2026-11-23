import { QuoteWall, type WallQuote } from "./QuoteWall";

// Sample quotes for the demo build, written around what KhelSpot actually does.
// Replace them with real player and venue feedback before launch.
const QUOTES: WallQuote[] = [
  {
    quote: "Every Friday I used to call three venues. Now I can see which pitch is free at 10 PM and book it before the group chat stops arguing.",
    highlight: "see which pitch is free at 10 PM",
    name: "Hamza Tariq",
    role: "Futsal player",
    place: "Johar Town",
  },
  {
    quote: "Checkout tells me exactly when I can cancel until and how much comes back. That's the part I trust.",
    highlight: "exactly when I can cancel until",
    name: "Ayesha Khan",
    role: "Badminton player",
    place: "Model Town",
  },
  {
    quote: "Walk-ins and online bookings sit in one calendar now. No more two teams turning up for Pitch 2.",
    highlight: "one calendar",
    name: "Usman Javed",
    role: "Venue manager",
    place: "Johar Town",
  },
  {
    quote: "Raat 11 baje padel? Pick the court, pay with JazzCash, done. The message says Booked, not Request sent.",
    highlight: "pay with JazzCash, done",
    name: "Bilal Ahmed",
    role: "Padel player",
    place: "DHA Phase 6",
  },
  {
    quote: "No booking fee on top. The court is Rs 4,500, I pay Rs 4,500.",
    highlight: "No booking fee",
    name: "Saad Iqbal",
    role: "Futsal player",
    place: "Gulberg",
  },
  {
    quote: "I can see who is coming tonight, who has paid online and who pays at the counter, all from my phone.",
    highlight: "who has paid online",
    name: "Faizan Akhtar",
    role: "Venue owner",
    place: "Model Town",
  },
  {
    quote: "Filtering by area means I stop scrolling past courts on the other side of Lahore.",
    highlight: "Filtering by area",
    name: "Hira Aslam",
    role: "Cricket player",
    place: "Gulberg III",
  },
  {
    quote: "Cash at the counter still works, so the regulars who never pay online keep coming.",
    highlight: "Cash at the counter still works",
    name: "Noman Haider",
    role: "Venue owner",
    place: "Gulberg",
  },
  {
    quote: "The booking message has the court, the time and the price. My friends just screenshot it and show up.",
    highlight: "the court, the time and the price",
    name: "Talha Butt",
    role: "Futsal player",
    place: "Johar Town",
  },
];

export function Voices() {
  return (
    <QuoteWall
      quotes={QUOTES}
      eyebrow="Players and venues"
      title="Less calling around. More playing."
      note="Sample quotes for this demo, not real customer reviews."
    />
  );
}
