// Kit components: square 4dp buttons, 2dp borders, 8dp cards, and the Ink screen header.

import type { ReactNode } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SpotLogo } from "./brand";
import { PressableScale } from "./motion";
import { UpdateBanner } from "./UpdateBanner";
import { radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

type ButtonKind = "primary" | "dark" | "outline";

/** Kit rule: Turf with Chalk on light screens, Floodlight with Ink on dark ones. */
const buttonColors = (c: Palette): Record<ButtonKind, { bg: string; fg: string; border: string }> => ({
  primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
  dark: { bg: c.floodlight, fg: c.ink, border: c.floodlight }, // on the Ink stage
  outline: { bg: "transparent", fg: c.text, border: c.strong },
});

export function Button({
  label,
  onPress,
  kind = "primary",
  busy = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const palette = usePalette();
  const styles = useStyles(makeStyles);
  const c = buttonColors(palette)[kind];
  const off = disabled || busy;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      onPress={onPress}
      disabled={off}
      feedback={kind === "outline" ? "select" : "press"}
      style={[styles.button, { backgroundColor: c.bg, borderColor: c.border, opacity: off ? 0.45 : 1 }, style]}
    >
      {busy ? <ActivityIndicator color={c.fg} /> : <Text style={[styles.buttonText, { color: c.fg }]}>{label}</Text>}
    </PressableScale>
  );
}

/** Ink header with the Spot logo and a Display title, then a Chalk scrolling body. */
export function Screen({
  title,
  kicker,
  children,
  refreshing,
  onRefresh,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxl }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.floodlight} colors={[c.turf]} />
          ) : undefined
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + space.lg }]}>
          <SpotLogo on="dark" size={22} />
          {kicker ? <Text style={[text.label, styles.kicker]}>{kicker}</Text> : null}
          <Text style={[text.display, styles.title]}>{title}</Text>
        </View>
        <View style={styles.body}>
          <UpdateBanner />
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const styles = useStyles(makeStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children, color }: { children: ReactNode; color?: string }) {
  const c = usePalette();
  return <Text style={[text.label, { color: color ?? c.textMuted }]}>{children}</Text>;
}

/** Small status tag. `tone` follows the kit: Turf = Booked/confirmed, Floodlight = open/new, Tape = urgent. */
export function Tag({ label, tone }: { label: string; tone: "turf" | "floodlight" | "tape" | "line" }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const map = {
    turf: { bg: c.turf, fg: c.chalk },
    floodlight: { bg: c.floodlight, fg: c.ink },
    tape: { bg: c.tape, fg: c.ink },
    line: { bg: c.subtle, fg: c.text },
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: map.bg }]}>
      <Text style={[text.label, { color: map.fg, fontSize: 11, lineHeight: 14 }]}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: { backgroundColor: c.stage, paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.md },
  kicker: { color: c.floodlight, marginTop: space.lg },
  title: { color: c.chalk },
  body: { padding: space.xl, gap: space.lg },
  button: {
    minHeight: 52,
    borderRadius: radius.control,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
  },
  buttonText: { ...text.bodyStrong, fontFamily: text.subhead.fontFamily },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: c.border,
    padding: space.lg,
    gap: space.sm,
  },
  tag: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
});
