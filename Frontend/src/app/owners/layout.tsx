import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "For venue owners", template: "%s · Venue owners · KhelSpot" },
};

export default function OwnersLayout({ children }: LayoutProps<"/owners">) {
  return children;
}
