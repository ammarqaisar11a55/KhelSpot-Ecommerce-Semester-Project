import { LogoMark, Wordmark } from "@/components/brand/LogoMark";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <a className="brand" href="#top" aria-label="KhelSpot home">
          <LogoMark size={24} />
          <Wordmark />
        </a>
        <p>
          Semester project for E-Commerce, The University of Lahore, Fall 2026. KhelSpot is not live yet, and the
          booking preview uses sample data.
        </p>
      </div>
    </footer>
  );
}
