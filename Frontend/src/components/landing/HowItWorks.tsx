const STEPS = [
  {
    title: "Pick your area and sport",
    body: "Choose an area of Lahore, like Johar Town or DHA, and padel, futsal, indoor cricket or badminton.",
  },
  {
    title: "See every open slot and its price",
    body: "Court 2, 9 to 10 PM, Rs 4,000. Every slot shows the court, the time and the price, peak or off-peak.",
  },
  {
    title: "Pay, and you're booked",
    body: "Pay with JazzCash, Easypaisa or card. You're booked straight away, and the confirmation reaches WhatsApp in a minute, with SMS as backup.",
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
