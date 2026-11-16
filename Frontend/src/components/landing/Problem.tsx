const CHAT = [
  { side: "out", text: "Slot available at 9 tonight?" },
  { side: "out", text: "Rate kya hai?" },
  { side: "in", text: "9 booked hai. 11 PM free" },
  { side: "in", text: "Rs 6000. Cash only" },
  { side: "out", text: "Ok can I pay online?" },
] as const;

export function Problem() {
  return (
    <section className="problem">
      <div className="wrap problem__grid">
        <div>
          <p className="eyebrow eyebrow--dark">How booking works today</p>
          <h2>Booking a court still takes an hour of WhatsApp.</h2>
          <p>
            Venues across Pakistan are paying for Facebook and Instagram ads, then sending every customer to
            WhatsApp or a phone number. You ask for a slot, wait for a reply, ask the rate, wait again, and often
            pay cash at the counter.
          </p>
          <p className="note">
            In our review of the Facebook Ads Library (October 2026), almost every padel, futsal and indoor
            cricket ad in Pakistan sent people to WhatsApp or a phone call to book.
          </p>
        </div>
        <div className="chat" aria-hidden="true">
          {CHAT.map((m) => (
            <p key={m.text} className={`msg msg--${m.side}`}>
              {m.text}
            </p>
          ))}
          <p className="msg msg--seen">Seen 40 min ago</p>
        </div>
      </div>
    </section>
  );
}
