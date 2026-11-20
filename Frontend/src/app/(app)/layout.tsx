import Link from "next/link";
import { SpotLogo } from "@/components/brand/SpotLogo";
import { AppNav } from "@/components/player/AppNav";
import s from "@/components/player/player.module.css";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className={s.header}>
        <div className={`wrap ${s.headerInner}`}>
          <Link className="brandSpot" href="/" aria-label="KhelSpot home">
            <SpotLogo on="dark" size={26} />
          </Link>
          <AppNav />
        </div>
      </header>
      <main>{children}</main>
      <footer className={s.footer}>
        <div className="wrap">
          Demo build. Venues, bookings and payments are sample data saved in this browser. No money is charged.
        </div>
      </footer>
    </>
  );
}
