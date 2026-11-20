// "The Spot" logo from brand kit v1.0: KHELSPOT set in Big Shoulders Black,
// with the O drawn as a solid dot (a ball, a map pin, an open slot).
// On dark: Chalk letters, Floodlight dot. On light: Ink letters, Turf dot.

type Tone = "dark" | "light";

const COLORS: Record<Tone, { fg: string; dot: string }> = {
  dark: { fg: "#F3F2EC", dot: "#D4F53C" },
  light: { fg: "#111513", dot: "#1F7A4D" },
};

interface Props {
  /** Background the logo sits on. */
  on?: Tone;
  /** Cap height in px (minimum 20 per the kit). */
  size?: number;
  className?: string;
}

export function SpotLogo({ on = "dark", size = 26, className }: Props) {
  const c = COLORS[on];
  return (
    <span
      className={className}
      role="img"
      aria-label="KhelSpot"
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--head)",
        fontWeight: 900,
        fontSize: Math.max(20, size),
        lineHeight: 0.76,
        letterSpacing: "0.01em",
        textTransform: "uppercase",
        color: c.fg,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true">KHELSP</span>
      <span
        aria-hidden="true"
        style={{ flex: "none", width: "0.5em", height: "0.5em", borderRadius: "50%", background: c.dot, margin: "0 0.045em 0 0.03em" }}
      />
      <span aria-hidden="true">T</span>
    </span>
  );
}
