import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import { INTRO_SCRIPT, LaunchIntro } from "@/components/LaunchIntro";
import "./globals.css";

// Brand kit v1.0 type: Big Shoulders (display, uppercase) and Archivo (text).
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  axes: ["opsz"],
  // next/font has no metrics for this family, so it can't build a size-matched
  // fallback (and warns). Use condensed system faces instead while it loads.
  adjustFontFallback: false,
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KhelSpot · Book indoor courts in Pakistan",
    template: "%s · KhelSpot",
  },
  description:
    "See free slots and prices at padel, futsal, indoor cricket and badminton courts near you, then book and pay online. Now booking in Lahore.",
  applicationName: "KhelSpot",
};

export const viewport: Viewport = {
  themeColor: "#111513",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-intro is set by INTRO_SCRIPT before React hydrates, hence suppressHydrationWarning.
    <html lang="en" className={`${bigShoulders.variable} ${archivo.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <LaunchIntro />
        {children}
      </body>
    </html>
  );
}
