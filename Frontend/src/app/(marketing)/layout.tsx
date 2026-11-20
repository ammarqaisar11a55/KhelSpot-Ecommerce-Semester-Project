import "./landing.css";

// Brand kit v1.0 tokens are global (globals.css); `kit` scopes the
// landing-only touches in landing.css (slot picker, chat panel, cards).
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return <div className="kit">{children}</div>;
}
