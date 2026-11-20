const PROMISES = [
  {
    title: "Paid means booked",
    body: "Nothing waits on the venue to reply. When payment goes through, the court is yours and the message says Booked.",
  },
  {
    title: "Refund deadline up front",
    body: "Checkout shows the exact time you can cancel until, like 2:00 PM, and how much comes back. Full refunds land in 3 to 5 working days.",
  },
  {
    title: "Filters that help",
    body: "Pick your area of Lahore and your sport, and skip the courts on the other side of town.",
  },
  {
    title: "No booking fee",
    body: "You pay the court's own rate and nothing on top. Venues pay for KhelSpot through their monthly plan.",
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
