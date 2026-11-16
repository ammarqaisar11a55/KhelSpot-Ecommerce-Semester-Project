import { WaitlistForm } from "./WaitlistForm";

export function Waitlist() {
  return (
    <section id="join" className="join">
      <div className="wrap join__grid">
        <div>
          <h2>Get in before launch.</h2>
          <p className="lead">
            Players get early access in their city. Venue owners get the first month free and help with setup.
          </p>
        </div>
        <WaitlistForm />
      </div>
    </section>
  );
}
