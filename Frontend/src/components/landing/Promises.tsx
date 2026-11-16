const PROMISES = [
  {
    title: "Paid means booked",
    body: "No “booking request” waiting for the venue to reply. When payment goes through, the slot is yours.",
  },
  {
    title: "Refund rules up front",
    body: "Each venue's cancellation window and refund amount is shown on the checkout screen, before you pay.",
  },
  {
    title: "Filters that help",
    body: "Search by city, area and sport, and skip the courts on the other side of town.",
  },
  {
    title: "Confirmation on WhatsApp",
    body: "You get the court, time and directions by WhatsApp and SMS. No screenshots to show at the gate.",
  },
];

export function Promises() {
  return (
    <section className="promises">
      <div className="wrap">
        <p className="eyebrow eyebrow--dark">What we fixed</p>
        <h2>Built around what players complain about.</h2>
        <div className="promises__grid">
          {PROMISES.map((p) => (
            <div key={p.title} className="promise">
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
