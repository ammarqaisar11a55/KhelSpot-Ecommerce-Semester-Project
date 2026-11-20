// Kit components: square 4dp buttons, 2dp borders, 8dp cards, and the Ink screen header.

import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SpotLogo } from "./brand";
import { UpdateBanner } from "./UpdateBanner";
import { colors, radius, space, text } from "@/theme";

type ButtonKind = "primary" | "dark" | "outline";

const BUTTON: Record<ButtonKind, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.turf, fg: colors.chalk, border: colors.turf }, // on light screens
  dark: { bg: colors.floodlight, fg: colors.ink, border: colors.floodlight }, // on Ink
  outline: { bg: "transparent", fg: colors.ink, border: colors.ink },
};

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
  const c = BUTTON[kind];
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: c.bg, borderColor: c.border, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={c.fg} /> : <Text style={[styles.buttonText, { color: c.fg }]}>{label}</Text>}
    </Pressable>
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
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxl }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.floodlight} colors={[colors.turf]} />
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
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children, color = colors.slate }: { children: ReactNode; color?: string }) {
  return <Text style={[text.label, { color }]}>{children}</Text>;
}

/** Small status tag. `tone` follows the kit: Turf = Booked/confirmed, Floodlight = open/new, Tape = urgent. */
export function Tag({ label, tone }: { label: string; tone: "turf" | "floodlight" | "tape" | "line" }) {
  const map = {
    turf: { bg: colors.turf, fg: colors.chalk },
    floodlight: { bg: colors.floodlight, fg: colors.ink },
    tape: { bg: colors.tape, fg: colors.ink },
    line: { bg: colors.line, fg: colors.ink },
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: map.bg }]}>
      <Text style={[text.label, { color: map.fg, fontSize: 11, lineHeight: 14 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.chalk },
  header: { backgroundColor: colors.ink, paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.md },
  kicker: { color: colors.floodlight, marginTop: space.lg },
  title: { color: colors.chalk },
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
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  tag: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
});
