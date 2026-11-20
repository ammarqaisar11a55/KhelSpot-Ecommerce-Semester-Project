import { fonts, type Palette } from "@/theme";

/** Ink tab bar in both themes, Floodlight for the active tab (the kit's accent on dark). */
export const tabScreenOptions = (c: Palette) => ({
  headerShown: false,
  // Cross-fade and slight shift between tabs instead of a hard cut.
  animation: "shift" as const,
  tabBarActiveTintColor: c.floodlight,
  tabBarInactiveTintColor: c.onStageMuted,
  tabBarStyle: { backgroundColor: c.stage, borderTopColor: c.stageLine, borderTopWidth: 1 },
  tabBarLabelStyle: { fontFamily: fonts.text700, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" as const },
  sceneStyle: { backgroundColor: c.bg },
});
