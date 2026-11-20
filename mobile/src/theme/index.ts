// Brand kit v1.0 for React Native: shared tokens, the light/dark palettes, and
// the font family names that expo-font registers in the root layout.
//
// Screens read colours through usePalette() and build styles with
// useStyles(makeStyles), so switching theme restyles everything at once.

import { useSyncExternalStore } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";
import { colors, radius, space, themes, type, type Palette } from "@shared/brand/tokens";
import { readJson, writeJson } from "@/lib/storage";

export { colors, radius, space, themes };
export type { Palette };

export const fonts = {
  display900: "BigShoulders_900Black",
  display800: "BigShoulders_800ExtraBold",
  text400: "Archivo_400Regular",
  text600: "Archivo_600SemiBold",
  text700: "Archivo_700Bold",
} as const;

const role = (r: (typeof type)[keyof typeof type]) => ({
  // Fixed-width digits so prices and times don't shift as they change.
  fontVariant: ["tabular-nums" as const],
  fontFamily: fonts[r.family],
  fontSize: r.size,
  lineHeight: r.lineHeight,
  ...("letterSpacing" in r ? { letterSpacing: r.letterSpacing } : null),
});

/** Type roles. No colours here: colour comes from the palette. */
export const text = StyleSheet.create({
  display: { ...role(type.displayL), textTransform: "uppercase" },
  heading: { ...role(type.heading), textTransform: "uppercase" },
  subhead: role(type.subhead),
  body: role(type.body),
  bodyStrong: role(type.bodyStrong),
  label: { ...role(type.label), textTransform: "uppercase" },
});

// ---------- theme preference ----------

export type ThemePreference = "system" | "light" | "dark";

let preference: ThemePreference = readJson<{ theme?: ThemePreference }>("theme")?.theme ?? "system";
const listeners = new Set<() => void>();

function applyNative(p: ThemePreference) {
  // Also themes native pieces (keyboard, alerts, date pickers) on phones.
  try {
    Appearance.setColorScheme?.(p === "system" ? "unspecified" : p);
  } catch {
    // Not supported on this platform (web): the palette still follows the choice.
  }
}
applyNative(preference);

export function setThemePreference(p: ThemePreference) {
  preference = p;
  writeJson("theme", { theme: p });
  applyNative(p);
  listeners.forEach((l) => l());
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => preference,
    () => preference,
  );
}

/** The palette for the current theme: the saved choice, or the phone's setting. */
export function usePalette(): Palette {
  const pref = useThemePreference();
  const system = useColorScheme();
  const scheme = pref === "system" ? (system === "dark" ? "dark" : "light") : pref;
  return themes[scheme];
}

const cache = new WeakMap<object, Map<Palette, unknown>>();

/** Styles built from the palette, created once per theme and reused. */
export function useStyles<T>(make: (c: Palette) => T): T {
  const c = usePalette();
  let byPalette = cache.get(make) as Map<Palette, T> | undefined;
  if (!byPalette) {
    byPalette = new Map();
    cache.set(make, byPalette);
  }
  let styles = byPalette.get(c);
  if (!styles) {
    styles = make(c);
    byPalette.set(c, styles);
  }
  return styles;
}
