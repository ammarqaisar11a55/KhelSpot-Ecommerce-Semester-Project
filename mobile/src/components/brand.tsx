// The Spot logo and symbol from brand kit v1.0, matching Frontend/src/components/brand.

import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors, fonts, useStyles, usePalette, type Palette } from "@/theme";

type Tone = "dark" | "light";

// `on` is the background the logo sits on, so these are fixed kit colours.
const TONES: Record<Tone, { fg: string; dot: string }> = {
  dark: { fg: colors.chalk, dot: colors.floodlight },
  light: { fg: colors.ink, dot: colors.turf },
};

/** KHELSP●T: Big Shoulders Black with the O drawn as a solid dot. `size` is the font size (min 20). */
export function SpotLogo({ on = "dark", size = 26 }: { on?: Tone; size?: number }) {
  const styles = useStyles(makeStyles);
  const c = TONES[on];
  const s = Math.max(20, size);
  const letters = { fontFamily: fonts.display900, fontSize: s, lineHeight: s * 1.05, color: c.fg, letterSpacing: s * 0.01 };
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="KhelSpot" style={styles.row}>
      <Text style={letters}>KHELSP</Text>
      <View
        style={{
          width: s * 0.5,
          height: s * 0.5,
          borderRadius: s * 0.25,
          backgroundColor: c.dot,
          marginLeft: s * 0.03,
          marginRight: s * 0.045,
        }}
      />
      <Text style={letters}>T</Text>
    </View>
  );
}

export const K_PATH = "M18 14.5h8v14.2L36.3 14.5h9.2L34.6 29.4 46 49.5h-9.3l-7.8-14.4-2.9 3.9v10.5h-8z";

/** The K-and-dot symbol on a Turf tile. For small spaces only; use SpotLogo where there is room. */
export function LogoMark({ size = 28 }: { size?: number }) {
  const c = usePalette();
  return (
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Rect width={64} height={64} rx={14.4} fill={c.turf} />
        <Path d={K_PATH} fill={c.chalk} />
        <Circle cx={47} cy={15.5} r={6} fill={c.floodlight} />
      </Svg>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start" },
});
