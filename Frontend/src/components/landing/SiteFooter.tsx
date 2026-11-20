import { SpotLogo } from "@/components/brand/SpotLogo";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <div className="footer__brand">
          <a className="brandSpot" href="#top" aria-label="KhelSpot home">
            <SpotLogo on="dark" size={26} />
          </a>
          <p className="footer__tag">Find it. Book it. Play.</p>
        </div>
        <p>
          Semester project for E-Commerce, The University of Lahore, Fall 2026. KhelSpot is not live yet, and the
          booking preview uses sample data.
        </p>
      </div>
    </footer>
  );
}
