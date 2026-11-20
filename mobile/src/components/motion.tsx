// Feedback and motion for the whole app.
//
// Motion answers a tap (a short spring press, a haptic) or marks one moment
// (a confirmed booking). Nothing animates on its own to decorate. Reduced
// motion is respected everywhere: presses keep the haptic, lose the scale.

import * as Haptics from "expo-haptics";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { radius, useStyles, usePalette, type Palette } from "@/theme";

// ---------- haptics ----------

const native = Platform.OS === "ios" || Platform.OS === "android";

export const haptic = {
  /** Picking a pill, a slot, a day. */
  select: () => native && void Haptics.selectionAsync().catch(() => {}),
  /** Pressing a primary action. */
  press: () => native && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** Booked, paid, saved. */
  success: () => native && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  /** Something didn't go through. */
  error: () => native && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};

// ---------- press ----------

const APressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 18, stiffness: 420, mass: 0.6 };

type PressableScaleProps = Omit<ComponentProps<typeof Pressable>, "style"> & {
  /** Plain styles only: the press state is shown by the scale, not by restyling. */
  style?: StyleProp<ViewStyle>;
  /** How far it sinks when held. Small targets can go further. */
  depth?: number;
  feedback?: "select" | "press" | "none";
};

/** Pressable that sinks slightly under the finger and gives a haptic tick. */
export function PressableScale({ depth = 0.97, feedback = "select", onPressIn, onPressOut, onPress, style, disabled, ...rest }: PressableScaleProps) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <APressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduce) scale.set(withSpring(depth, SPRING));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduce) scale.set(withSpring(1, SPRING));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (feedback !== "none") haptic[feedback]();
        onPress?.(e);
      }}
      style={[style, anim]}
    />
  );
}

// ---------- loading ----------

/** A block the shape of the content that is loading, breathing slowly. */
export function Skeleton({ width = "100%", height, style, tone = "light" }: { width?: number | `${number}%`; height: number; style?: StyleProp<ViewStyle>; tone?: "light" | "dark" }) {
  const c = usePalette();
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    o.set(withRepeat(withSequence(withTiming(0.55, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
  }, [o, reduce]);
  const anim = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius.control, backgroundColor: tone === "dark" ? c.stage2 : c.subtle }, anim, style]}
    />
  );
}

/** Placeholder for a venue card: photo, two lines, a row of times. */
export function VenueCardSkeleton() {
  const sk = useStyles(makeSk);
  return (
    <View style={sk.card} accessibilityLabel="Loading courts">
      <Skeleton height={150} style={{ borderRadius: 0 }} />
      <View style={sk.body}>
        <Skeleton width="45%" height={12} />
        <Skeleton width="75%" height={26} />
        <Skeleton width="35%" height={16} />
        <View style={sk.times}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width={64} height={36} />
          ))}
        </View>
      </View>
    </View>
  );
}

/** Placeholder for a slot grid: three columns of cells. */
export function SlotGridSkeleton({ cells = 9 }: { cells?: number }) {
  const sk = useStyles(makeSk);
  return (
    <View style={sk.grid} accessibilityLabel="Loading open times">
      {Array.from({ length: cells }, (_, i) => (
        <Skeleton key={i} width="31.5%" height={56} />
      ))}
    </View>
  );
}

/** Placeholder for a list of rows. */
export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  const sk = useStyles(makeSk);
  return (
    <View style={sk.rows} accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={sk.row}>
          <Skeleton width="40%" height={12} />
          <Skeleton width="70%" height={20} />
          <Skeleton width="55%" height={14} />
        </View>
      ))}
    </View>
  );
}

// ---------- the one orchestrated moment ----------

/**
 * Confirmation entrance: the card drops in like a ticket being stamped, then the
 * status tag lands. Used once, on "You're booked". Static with reduced motion.
 */
export function StampIn({ children, tag, play }: { children: ReactNode; tag: ReactNode; play: boolean }) {
  const reduce = useReducedMotion();
  const animate = play && !reduce;
  const y = useSharedValue(animate ? 28 : 0);
  const o = useSharedValue(animate ? 0 : 1);
  const s = useSharedValue(animate ? 1.6 : 1);
  const r = useSharedValue(animate ? -8 : 0);
  useEffect(() => {
    if (!animate) return;
    const ease = Easing.out(Easing.cubic);
    y.set(withTiming(0, { duration: 420, easing: ease }));
    o.set(withTiming(1, { duration: 320, easing: ease }));
    s.set(withDelay(260, withSpring(1, { damping: 11, stiffness: 260 })));
    r.set(withDelay(260, withSpring(-2, { damping: 11, stiffness: 260 })));
    const t = setTimeout(haptic.success, 330);
    return () => clearTimeout(t);
  }, [animate, o, r, s, y]);
  const card = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ translateY: y.get() }] }));
  const stamp = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }, { rotate: `${r.get()}deg` }] }));
  return (
    <Animated.View style={card}>
      <Animated.View style={[{ alignSelf: "flex-start" }, stamp]}>{tag}</Animated.View>
      {children}
    </Animated.View>
  );
}

/** Slides a bottom bar up when it appears (e.g. the price bar after picking a slot). */
export function SlideUp({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(reduce ? 0 : 80);
  useEffect(() => {
    if (!reduce) y.set(withSpring(0, { damping: 20, stiffness: 240 }));
  }, [reduce, y]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

const makeSk = (c: Palette) =>
  StyleSheet.create({
  card: { backgroundColor: c.surface, borderRadius: radius.card, borderWidth: 2, borderColor: c.border, overflow: "hidden" },
  body: { padding: 16, gap: 10 },
  times: { flexDirection: "row", gap: 8, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rows: { backgroundColor: c.surface, borderRadius: radius.card, borderWidth: 2, borderColor: c.border, overflow: "hidden" },
  row: { padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: c.border },
});
