// KhelSpot brand kit v1.0 tokens, shared by the web app and the mobile app.
// Source: the "KhelSpot brand kit" project in Claude Design; summary in brand/BRAND.md §4.

export const colors = {
  ink: "#111513", // text, night-game surfaces, tab bar
  ink2: "#1A1F1C",
  inkLine: "#2C332F",
  chalk: "#F3F2EC", // default light background
  sand: "#E4E3DC",
  line: "#D8D7CF", // borders, booked slots
  turf: "#1F7A4D", // brand surfaces, primary actions, confirmed
  deepTurf: "#0E3B26",
  floodlight: "#D4F53C", // open slots, live offers (dark layouts' accent)
  floodlightDark: "#C2E22A",
  tape: "#FF5B1F", // urgency only, always with ink text
  slate: "#59625D", // secondary text on light
  mutedOnInk: "#A9B0AB", // secondary text on ink
  white: "#FFFFFF",
} as const;

/**
 * Light and dark themes, both built only from the kit's colours.
 * The kit's light layouts are Chalk with Ink text and Turf actions; its dark
 * ("night game") layouts are Ink with Chalk text and Floodlight as the accent.
 * The stage (headers, hero, tab bar) is Ink in both, as in the kit.
 */
const light = {
  bg: colors.chalk,
  surface: colors.white,
  subtle: colors.sand,
  border: colors.line,
  text: colors.ink,
  textMuted: colors.slate,
  /** 2dp outlines on inputs and outline buttons, and the selected pill. */
  strong: colors.ink,
  onStrong: colors.chalk,
  primary: colors.turf, // Turf with Chalk text on light screens
  onPrimary: colors.chalk,
  link: colors.turf,
  stage: colors.ink,
  stage2: colors.ink2,
  stageLine: colors.inkLine,
  onStage: colors.chalk,
  onStageMuted: colors.mutedOnInk,
};

type Roles = { [K in keyof typeof light]: string };

const dark: Roles = {
  bg: colors.ink,
  surface: colors.ink2,
  subtle: colors.inkLine,
  border: colors.inkLine,
  text: colors.chalk,
  textMuted: colors.mutedOnInk,
  strong: colors.chalk,
  onStrong: colors.ink,
  primary: colors.floodlight, // Floodlight with Ink text on dark screens
  onPrimary: colors.ink,
  link: colors.floodlight,
  stage: colors.ink,
  stage2: colors.ink2,
  stageLine: colors.inkLine,
  onStage: colors.chalk,
  onStageMuted: colors.mutedOnInk,
};

/** Fixed brand colours that read the same in both themes (Turf, Floodlight, Tape, Ink, Chalk). */
const fixed = {
  turf: colors.turf,
  deepTurf: colors.deepTurf,
  floodlight: colors.floodlight,
  tape: colors.tape,
  ink: colors.ink,
  chalk: colors.chalk,
};

export type Palette = Roles & typeof fixed & { scheme: "light" | "dark" };

export const themes: { light: Palette; dark: Palette } = {
  light: { ...(light as Roles), ...fixed, scheme: "light" },
  dark: { ...dark, ...fixed, scheme: "dark" },
};

/**
 * Type scale. Display faces are Big Shoulders (always uppercase, "Rs" keeps its case);
 * text is Archivo. Sizes are in px / dp.
 */
export const type = {
  displayL: { family: "display900", size: 48, lineHeight: 43 },
  heading: { family: "display800", size: 32, lineHeight: 32 },
  subhead: { family: "text700", size: 20, lineHeight: 26 },
  body: { family: "text400", size: 16, lineHeight: 25 },
  bodyStrong: { family: "text600", size: 16, lineHeight: 25 },
  label: { family: "text700", size: 12, lineHeight: 16, letterSpacing: 1.7 },
} as const;

export const radius = { control: 4, card: 8, pill: 999 } as const;
export const border = { control: 2, hairline: 1 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Contrast pairs approved by the kit (ratio). Never Chalk on Tape (2.8:1). */
export const pairs = {
  inkOnChalk: 16.4,
  chalkOnTurf: 4.7,
  inkOnFloodlight: 14.8,
  inkOnTape: 5.9,
  floodlightOnTurfHeadlinesOnly: 4.3,
} as const;
