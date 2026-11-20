import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { addDays, dayOfMonth, formatHour, operatingNow, relativeDay, weekdayShort } from "@shared/domain/time";
import { owner } from "@/api/client";
import { useQuery } from "@/api/useQuery";
import { ErrorState, Loading, Pills } from "@/components/kit";
import { Screen } from "@/components/ui";
import { courtDay, isLive } from "@/owner/day";
import { OwnerGate } from "@/owner/OwnerGate";
import type { OwnedVenue } from "@/owner/store";
import { radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

const CELL_W = 104;
const HOUR_W = 60;

function Calendar({ v }: { v: OwnedVenue }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const today = operatingNow().date;
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const [date, setDate] = useState(today);
  const day = useQuery(`owner-day|${v.venueId}|${date}`, async () => {
    const [venue, bookings] = await Promise.all([owner.venue(v.venueId), owner.bookings(v.venueId, date, date)]);
    return { venue, bookings };
  });
  const now = operatingNow();

  return (
    <>
      <Pills
        label="Day"
        options={days.map((d, i) => ({ id: d, label: i < 2 ? relativeDay(d, today) : `${weekdayShort(d)} ${dayOfMonth(d)}` }))}
        value={date}
        onChange={setDate}
      />
      {day.error ? (
        <ErrorState error={day.error} onRetry={day.refresh} />
      ) : !day.data ? (
        <Loading label="Loading calendar" />
      ) : (
        (() => {
          const { venue, bookings } = day.data;
          const grid = venue.courts.map((c) => ({ court: c, cells: courtDay(venue, c, bookings, date) }));
          const booked = bookings.filter(isLive).reduce((n, b) => n + b.hours, 0);
          const hours = grid[0]?.cells.map((c) => c.hour) ?? [];
          return (
            <>
              <Text style={[text.bodyStrong, { color: c.text }]}>
                {booked} booked {booked === 1 ? "hour" : "hours"} · tap an open hour to add a walk-in
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={styles.headRow}>
                    <View style={{ width: HOUR_W }} />
                    {grid.map(({ court }) => (
                      <Text key={court.id} style={[text.label, styles.head]} numberOfLines={1}>
                        {court.name}
                      </Text>
                    ))}
                  </View>
                  {hours.map((h, i) => {
                    const isNow = date === now.date && h <= now.hour && now.hour < h + 1;
                    return (
                      <View key={h} style={styles.row}>
                        <View style={[styles.hour, isNow && styles.hourNow]}>
                          <Text style={[text.bodyStrong, { fontSize: 13, lineHeight: 16, color: isNow ? c.ink : c.textMuted }]}>
                            {formatHour(h)}
                          </Text>
                        </View>
                        {grid.map(({ court, cells }) => {
                          const cell = cells[i];
                          const b = cell.booking;
                          const first = b && b.start === h;
                          const label =
                            cell.status === "booked" || cell.status === "held"
                              ? first
                                ? b!.customer.name
                                : "·"
                              : cell.status === "open"
                                ? "Open"
                                : "";
                          return (
                            <Pressable
                              key={court.id}
                              disabled={cell.status === "past" || cell.status === "closed"}
                              accessibilityRole="button"
                              accessibilityLabel={`${court.name}, ${formatHour(h)}, ${b ? `${b.customer.name}${b.paid ? ", paid" : ", not paid"}` : cell.status}`}
                              onPress={() =>
                                b
                                  ? router.push({ pathname: "/manage/booking/[ref]", params: { ref: b.ref } })
                                  : router.push({ pathname: "/manage/walk-in", params: { courtId: court.id, date, start: String(h) } })
                              }
                              style={[
                                styles.cell,
                                cell.status === "booked" && (b?.paid ? styles.paid : styles.unpaid),
                                cell.status === "held" && styles.held,
                                cell.status === "past" && styles.past,
                                cell.status === "closed" && styles.closed,
                              ]}
                            >
                              <Text
                                numberOfLines={1}
                                style={[
                                  text.label,
                                  {
                                    fontSize: 10,
                                    lineHeight: 12,
                                    letterSpacing: 0.6,
                                    color: cell.status === "booked" && b?.paid ? c.chalk : c.text,
                                  },
                                ]}
                              >
                                {label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
              <View style={styles.legend}>
                {[
                  [c.turf, "Paid"],
                  [c.surface, "Pay at venue", c.turf],
                  [c.subtle, "Paying online"],
                ].map(([bg, label, border]) => (
                  <View key={label} style={styles.legendItem}>
                    <View style={[styles.swatch, { backgroundColor: bg, borderColor: border ?? bg }]} />
                    <Text style={[text.body, { color: c.textMuted, fontSize: 13 }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </>
          );
        })()
      )}
    </>
  );
}

export default function OwnerCalendar() {
  return (
    <Screen title="Calendar">
      <OwnerGate>{(v) => <Calendar v={v} />}</OwnerGate>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  headRow: { flexDirection: "row", marginBottom: space.xs },
  head: { width: CELL_W, color: c.text, paddingHorizontal: 4 },
  row: { flexDirection: "row", marginBottom: 4 },
  hour: { width: HOUR_W, justifyContent: "center", paddingLeft: 4, borderRadius: radius.control, marginRight: 4 },
  hourNow: { backgroundColor: c.floodlight },
  cell: {
    width: CELL_W - 4,
    height: 40,
    marginRight: 4,
    borderRadius: radius.control,
    borderWidth: 2,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  paid: { backgroundColor: c.turf, borderColor: c.turf },
  unpaid: { backgroundColor: c.surface, borderColor: c.turf },
  held: { backgroundColor: c.subtle, borderColor: c.subtle },
  past: { opacity: 0.45 },
  closed: { backgroundColor: c.subtle, borderColor: c.subtle, opacity: 0.5 },
  legend: { flexDirection: "row", gap: space.lg, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 3, borderWidth: 2 },
});
