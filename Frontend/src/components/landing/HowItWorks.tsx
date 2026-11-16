const STEPS = [
  {
    title: "Pick your city and sport",
    body: "Filter by Lahore, Karachi or Islamabad, and by padel, futsal, indoor cricket or badminton.",
  },
  {
    title: "See what's free and what it costs",
    body: "Every court shows its open slots and the per-hour rate, including peak and off-peak prices.",
  },
  {
    title: "Pay, and the slot is yours",
    body: "Pay with JazzCash, Easypaisa or card. The booking is confirmed straight away and sent to you by WhatsApp and SMS.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="how">
      <div className="wrap">
        <p className="eyebrow eyebrow--dark">How KhelSpot works</p>
        <h2>Three steps. No phone calls.</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="steps__n">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
