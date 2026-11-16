const QUESTIONS = [
  {
    q: "Which cities are first?",
    a: "Lahore and Karachi, where search interest in padel and indoor cricket is highest. Islamabad follows, then smaller cities where new indoor arenas are opening.",
  },
  {
    q: "Do players pay anything extra?",
    a: "No. Venues pay for KhelSpot through their monthly plan, so you pay the court's rate and nothing on top.",
  },
  {
    q: "What happens if I need to cancel?",
    a: "Every venue sets a cancellation window, and you see it before paying. Cancel inside that window and the refund goes back to the account you paid from.",
  },
  {
    q: "Can I still pay cash?",
    a: "Venues can choose to accept pay-at-venue bookings, but online payment is what confirms your slot instantly.",
  },
  {
    q: "I run a venue. How long does setup take?",
    a: "Add your courts, opening hours and rates, and you can take bookings the same day. We help you set up during the free month.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="faq">
      <div className="wrap faq__wrap">
        <h2>Questions</h2>
        {QUESTIONS.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
