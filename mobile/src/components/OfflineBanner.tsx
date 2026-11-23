// Shown while the server can't be reached. Screens keep showing what was loaded last
// (useQuery saves it on the phone); this says so, and Retry asks every open screen again.

import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useReachable } from "@/api/client";
import { retryAllQueries } from "@/api/useQuery";
import { haptic } from "./motion";
import { colors, fonts, radius, space } from "@/theme";

export function OfflineBanner() {
  const reachable = useReachable();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [trying, setTrying] = useState(false);
  if (reachable) return null;

  const retry = () => {
    haptic.select();
    setTrying(true);
    retryAllQueries();
    setTimeout(() => setTrying(false), 1500);
  };

  return (
    <Animated.View
      entering={reduce ? undefined : FadeInDown.springify().damping(18)}
      exiting={reduce ? undefined : FadeOutDown.duration(180)}
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + 64 }]}
    >
      <View style={styles.pill} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Svg width={18} height={18} viewBox="0 0 24 24" aria-hidden>
          <Path d="M2 8.8a15 15 0 0 1 20 0M5.5 12.4a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0M12 20h.01M3 3l18 18" stroke={colors.floodlight} strokeWidth={2} strokeLinecap="round" fill="none" />
        </Svg>
        <Text style={styles.text} numberOfLines={2}>
          No connection. Anything loaded before still shows.
        </Text>
        <Pressable onPress={retry} accessibilityRole="button" hitSlop={8} style={styles.retry} disabled={trying}>
          {trying ? <ActivityIndicator size="small" color={colors.ink} /> : <Text style={styles.retryText}>Retry</Text>}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: space.md, right: space.md, alignItems: "center", zIndex: 50, elevation: 50 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    maxWidth: 520,
    width: "100%",
    paddingLeft: space.md,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.inkLine,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  text: { flex: 1, fontFamily: fonts.text600, fontSize: 13, lineHeight: 18, color: colors.chalk },
  retry: { minWidth: 72, minHeight: 36, borderRadius: radius.pill, backgroundColor: colors.floodlight, alignItems: "center", justifyContent: "center", paddingHorizontal: space.md },
  retryText: { fontFamily: fonts.text700, fontSize: 13, color: colors.ink },
});
