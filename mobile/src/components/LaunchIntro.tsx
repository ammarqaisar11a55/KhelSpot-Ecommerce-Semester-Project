// The opening moment: the native Ink splash hands over to this view on the exact same frame
// (same image, same size, same centre), then the floodlight switches on.
//
//   0.12s  the Floodlight dot pops, a glow and a ring spread from it, one light haptic
//   0.38s  a court line draws out under the logo, the tagline rises in
//   1.25s  the logo lifts away, the Ink fades to reveal the app already rendered beneath
//
// About 1.8s in all, every value on the UI thread (transform and opacity only), tap to skip.
// Reduced motion: no pop or glow, just a short fade.

import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { haptic } from "./motion";
import { colors, fonts } from "@/theme";

// assets/images/splash-icon.png is 690 x 208; the native splash draws it 220 wide (app.config.ts).
const LOGO_W = 220;
const LOGO_H = (LOGO_W * 208) / 690;
// The dot in that image, measured from its pixels.
const DOT = { x: LOGO_W * 0.7833, y: LOGO_H * 0.4976, r: LOGO_W * 0.0572 };

const OUT = Easing.out(Easing.cubic);

export function LaunchIntro({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const started = useRef(false);

  const pop = useSharedValue(1); // dot scale
  const glow = useSharedValue(0); // filled glow 0..1
  const ring = useSharedValue(0); // outline ring 0..1
  const line = useSharedValue(0); // court line draw 0..1
  const tag = useSharedValue(0); // tagline 0..1
  const exit = useSharedValue(0); // logo lifts away 0..1
  const veil = useSharedValue(1); // the Ink sheet over the app

  const finish = () => onDone();

  const leave = (delay: number, fast = false) => {
    exit.set(withDelay(delay, withTiming(1, { duration: fast ? 200 : 420, easing: Easing.in(Easing.cubic) })));
    veil.set(
      withDelay(
        delay + (fast ? 60 : 130),
        withTiming(0, { duration: fast ? 240 : 420, easing: OUT }, (done) => {
          if (done) scheduleOnRN(finish);
        }),
      ),
    );
  };

  const start = () => {
    if (started.current) return;
    started.current = true;
    // The first frame matches the native splash, so hiding it now shows no seam.
    void SplashScreen.hideAsync().catch(() => {});
    if (reduce) {
      leave(250, true);
      return;
    }
    pop.set(withDelay(120, withSequence(withTiming(1.24, { duration: 170, easing: OUT }), withSpring(1, { damping: 9, stiffness: 240 }))));
    glow.set(withDelay(120, withTiming(1, { duration: 950, easing: Easing.out(Easing.quad) })));
    ring.set(withDelay(260, withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) })));
    line.set(withDelay(380, withTiming(1, { duration: 560, easing: Easing.out(Easing.exp) })));
    tag.set(withDelay(520, withTiming(1, { duration: 460, easing: OUT })));
    setTimeout(haptic.press, 120);
    leave(1250);
  };

  // If the image never reports in, don't leave the native splash up.
  useEffect(() => {
    const t = setTimeout(start, 700);
    return () => clearTimeout(t);
  });

  const skip = () => {
    if (!started.current) return;
    leave(0, true);
  };

  const sheet = useAnimatedStyle(() => ({ opacity: veil.get() }));
  const group = useAnimatedStyle(() => ({
    opacity: 1 - exit.get(),
    transform: [{ translateY: -14 * exit.get() }, { scale: 1 - 0.05 * exit.get() }],
  }));
  const dot = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.get() === 0 ? 0 : 0.42 * (1 - glow.get()),
    transform: [{ scale: interpolate(glow.get(), [0, 1], [1, 2.8]) }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.get() === 0 ? 0 : 0.75 * (1 - ring.get()),
    transform: [{ scale: interpolate(ring.get(), [0, 1], [1, 4.2]) }],
  }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: line.get() }] }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tag.get(),
    transform: [{ translateY: 8 * (1 - tag.get()) }],
  }));

  const at = { left: DOT.x - DOT.r, top: DOT.y - DOT.r, width: DOT.r * 2, height: DOT.r * 2, borderRadius: DOT.r };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.sheet, sheet]} accessibilityLabel="KhelSpot is opening">
      <Pressable style={styles.center} onPress={skip} accessibilityRole="button" accessibilityHint="Skips the opening animation">
        <Animated.View style={group}>
          {/* Same box as the native splash: the logo stays dead centre, extras hang below it. */}
          <View style={{ width: LOGO_W, height: LOGO_H }}>
            <Animated.View pointerEvents="none" style={[styles.glow, at, glowStyle]} />
            <Animated.View pointerEvents="none" style={[styles.ring, at, ringStyle]} />
            <Image source={require("../../assets/images/splash-icon.png")} style={{ width: LOGO_W, height: LOGO_H }} onLoad={start} fadeDuration={0} />
            <Animated.View pointerEvents="none" style={[styles.dot, at, dot]} />
            <View style={styles.below} pointerEvents="none">
              <Animated.View style={[styles.line, lineStyle]} />
              <Animated.Text style={[styles.tag, tagStyle]}>FIND IT. BOOK IT. PLAY.</Animated.Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.ink, zIndex: 100, elevation: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", backgroundColor: colors.floodlight },
  glow: { position: "absolute", backgroundColor: colors.floodlight },
  ring: { position: "absolute", borderWidth: 2, borderColor: colors.floodlight },
  below: { position: "absolute", top: LOGO_H + 22, left: 0, right: 0, alignItems: "center", gap: 14 },
  line: { width: 72, height: 3, borderRadius: 2, backgroundColor: colors.floodlight },
  tag: { fontFamily: fonts.text700, fontSize: 12, letterSpacing: 2.6, color: colors.mutedOnInk },
});

