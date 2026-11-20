// One court's hours for a day. Open = Floodlight (the kit's open-slot colour),
// booked = Line, past = faded, selected range = Ink.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatRupees } from "@shared/domain/pricing";
import { formatHour } from "@shared/domain/time";
import type { Slot } from "@/api/client";
import { colors, radius, space, text } from "@/theme";

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
  const shown = slots.filter((s) => s.status !== "no-rate");
  if (!shown.length) {
    return <Text style={[text.body, { color: colors.slate }]}>No bookable hours this day.</Text>;
  }
  const inRange = (h: number) => selected != null && h >= selected && h < selected + (hours ?? 1);
  return (
    <View style={styles.grid}>
      {shown.map((s) => {
        const on = inRange(s.hour);
        const free = s.status === "free";
        const bg = on ? colors.ink : free ? colors.floodlight : s.status === "booked" ? colors.line : colors.sand;
        const fg = on ? colors.chalk : free ? colors.ink : colors.slate;
        const label = `${formatHour(s.hour)}, ${free ? (s.price ? formatRupees(s.price) : "open") : s.status === "booked" ? "booked" : "past"}`;
        return (
          <Pressable
            key={s.hour}
            disabled={readOnly || !free}
            onPress={() => onSelect?.(s.hour)}
            accessibilityRole={readOnly ? undefined : "button"}
            accessibilityLabel={label}
            accessibilityState={{ selected: on, disabled: !free }}
            style={({ pressed }) => [styles.cell, { backgroundColor: bg, opacity: s.status === "past" ? 0.55 : pressed ? 0.85 : 1 }]}
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
          </Pressable>
        );
      })}
    </View>
  );
}

export function SlotLegend() {
  const item = (bg: string, label: string) => (
    <View style={styles.legendItem} key={label}>
      <View style={[styles.swatch, { backgroundColor: bg }]} />
      <Text style={[text.body, { color: colors.slate, fontSize: 13, lineHeight: 18 }]}>{label}</Text>
    </View>
  );
  return <View style={styles.legend}>{[item(colors.floodlight, "Open"), item(colors.line, "Booked"), item(colors.ink, "Your pick")]}</View>;
}

const styles = StyleSheet.create({
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
