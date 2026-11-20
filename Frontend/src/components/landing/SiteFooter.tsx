import { cacheLife } from "next/cache";
import Link from "next/link";
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
        <nav className="footer__links" aria-label="Footer">
          <Link href="/venues">Find courts</Link>
          <Link href="/bookings">My bookings</Link>
          <Link href="/owners/signup">List your venue</Link>
          <Link href="/owners/login">Venue sign in</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <p className="footer__legal">© <CopyrightYear /> KhelSpot. Lahore, Pakistan.</p>
      </div>
    </footer>
  );
}

/** The current year, cached so the footer can still be prerendered; refreshes daily. */
async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
