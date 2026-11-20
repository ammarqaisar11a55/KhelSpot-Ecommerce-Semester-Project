// Brand kit v1.0 for React Native: shared tokens plus the font family names
// that expo-font registers in the root layout.

import { StyleSheet } from "react-native";
import { colors, radius, space, type } from "@shared/brand/tokens";

export { colors, radius, space };

export const fonts = {
  display900: "BigShoulders_900Black",
  display800: "BigShoulders_800ExtraBold",
  text400: "Archivo_400Regular",
  text600: "Archivo_600SemiBold",
  text700: "Archivo_700Bold",
} as const;

const role = (r: (typeof type)[keyof typeof type]) => ({
  fontFamily: fonts[r.family],
  fontSize: r.size,
  lineHeight: r.lineHeight,
  ...("letterSpacing" in r ? { letterSpacing: r.letterSpacing } : null),
});

export const text = StyleSheet.create({
  display: { ...role(type.displayL), textTransform: "uppercase" },
  heading: { ...role(type.heading), textTransform: "uppercase" },
  subhead: role(type.subhead),
  body: role(type.body),
  bodyStrong: role(type.bodyStrong),
  label: { ...role(type.label), textTransform: "uppercase" },
});
