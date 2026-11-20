// One court's hours for a day. Open = Floodlight (the kit's open-slot colour),
// booked = Line, past = faded, selected range = Ink.

import { StyleSheet, Text, View } from "react-native";
import { PressableScale } from "./motion";
import { formatRupees } from "@shared/domain/pricing";
import { formatHour } from "@shared/domain/time";
import type { Slot } from "@/api/client";
import { radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

export function SlotGrid({
  slots,
  selected,
  hours,
  onSelect,
  readOnly = false,
}: {
  slots: Slot[];
  selected?: number | null;
  hours?: number;
  onSelect?: (hour: number) => void;
  readOnly?: boolean;
}) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const shown = slots.filter((s) => s.status !== "no-rate");
  if (!shown.length) {
    return <Text style={[text.body, { color: c.textMuted }]}>No bookable hours this day.</Text>;
  }
  const inRange = (h: number) => selected != null && h >= selected && h < selected + (hours ?? 1);
  return (
    <View style={styles.grid}>
      {shown.map((s) => {
        const on = inRange(s.hour);
        const free = s.status === "free";
        const bg = on ? c.strong : free ? c.floodlight : s.status === "booked" ? c.border : c.subtle;
        const fg = on ? c.onStrong : free ? c.ink : c.textMuted;
        const label = `${formatHour(s.hour)}, ${free ? (s.price ? formatRupees(s.price) : "open") : s.status === "booked" ? "booked" : "past"}`;
        return (
          <PressableScale
            key={s.hour}
            depth={0.92}
            disabled={readOnly || !free}
            onPress={() => onSelect?.(s.hour)}
            accessibilityRole={readOnly ? undefined : "button"}
            accessibilityLabel={label}
            accessibilityState={{ selected: on, disabled: !free }}
            style={[styles.cell, { backgroundColor: bg, opacity: s.status === "past" ? 0.5 : 1 }]}
          >
            <Text
              style={[
                text.bodyStrong,
                { color: fg, fontSize: 15, lineHeight: 19 },
                s.status === "booked" && { textDecorationLine: "line-through" },
              ]}
            >
              {formatHour(s.hour)}
            </Text>
            <Text style={[text.label, { color: fg, fontSize: 10, lineHeight: 13, letterSpacing: 0.8 }]}>
              {free ? (s.price ? formatRupees(s.price) : "Open") : s.status === "booked" ? "Booked" : "Past"}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function SlotLegend() {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const item = (bg: string, label: string) => (
    <View style={styles.legendItem} key={label}>
      <View style={[styles.swatch, { backgroundColor: bg }]} />
      <Text style={[text.body, { color: c.textMuted, fontSize: 13, lineHeight: 18 }]}>{label}</Text>
    </View>
  );
  return <View style={styles.legend}>{[item(c.floodlight, "Open"), item(c.border, "Booked"), item(c.strong, "Your pick")]}</View>;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  cell: {
    width: "31.5%",
    minHeight: 56,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.sm,
  },
  legend: { flexDirection: "row", gap: space.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 3 },
});
