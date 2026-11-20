import { colors, fonts } from "@/theme";

/** Ink tab bar, Floodlight for the active tab (the kit's accent on dark), muted Chalk otherwise. */
export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.floodlight,
  tabBarInactiveTintColor: colors.mutedOnInk,
  tabBarStyle: { backgroundColor: colors.ink, borderTopColor: colors.inkLine, borderTopWidth: 1 },
  tabBarLabelStyle: { fontFamily: fonts.text700, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" as const },
  sceneStyle: { backgroundColor: colors.chalk },
};
