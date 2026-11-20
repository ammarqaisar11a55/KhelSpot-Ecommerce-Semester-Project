import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { addDays, dayOfMonth, formatHour, operatingNow, relativeDay, weekdayShort } from "@shared/domain/time";
import { api, type CourtAvailability } from "@/api/client";
import { useQuery } from "@/api/useQuery";
import { ErrorState, Loading, Pills } from "@/components/kit";
import { Screen } from "@/components/ui";
import { setOwnerVenue, useOwnerVenue } from "@/owner/store";
import { VenuePicker } from "@/owner/VenuePicker";
import { colors, radius, space, text } from "@/theme";

const CELL_W = 92;
const HOUR_W = 64;

/** Courts across, hours down, like the web owner calendar. Booked = Turf, open = white, past = faded. */
function Grid({ courts, date }: { courts: CourtAvailability[]; date: string }) {
  const now = operatingNow();
  const hours = [...new Set(courts.flatMap((c) => c.slots.filter((s) => s.status !== "no-rate").map((s) => s.hour)))].sort((a, b) => a - b);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={styles.headRow}>
          <View style={{ width: HOUR_W }} />
          {courts.map((c) => (
            <Text key={c.courtId} style={[text.label, styles.head]} numberOfLines={1}>
              {c.name}
            </Text>
          ))}
        </View>
        {hours.map((h) => {
          const isNow = date === now.date && h <= now.hour && now.hour < h + 1;
          return (
            <View key={h} style={styles.row}>
              <View style={[styles.hour, isNow && styles.hourNow]}>
                <Text style={[text.bodyStrong, { fontSize: 13, lineHeight: 16, color: isNow ? colors.ink : colors.slate }]}>
                  {formatHour(h)}
                </Text>
              </View>
              {courts.map((c) => {
                const s = c.slots.find((x) => x.hour === h);
                const status = s?.status ?? "no-rate";
                const booked = status === "booked";
                return (
                  <View
                    key={c.courtId}
                    accessibilityLabel={`${c.name}, ${formatHour(h)}, ${booked ? "booked" : status === "free" ? "open" : status === "past" ? "past" : "closed"}`}
                    style={[
                      styles.cell,
                      booked && styles.booked,
                      status === "past" && styles.past,
                      status === "no-rate" && styles.closed,
                    ]}
                  >
                    <Text style={[text.label, { fontSize: 10, lineHeight: 12, color: booked ? colors.chalk : colors.slate }]}>
                      {booked ? "Booked" : status === "free" ? "Open" : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default function OwnerCalendar() {
  const slug = useOwnerVenue();
  const today = operatingNow().date;
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const [date, setDate] = useState(today);
  const venue = useQuery(slug ? `venue|${slug}` : null, () => api.venue(slug!));
  const avail = useQuery(slug ? `avail|${slug}|${date}` : null, () => api.availability(slug!, date));

  if (!slug) {
    return (
      <Screen title="Calendar">
        <VenuePicker />
      </Screen>
    );
  }

  const courts = avail.data?.courts ?? [];
  const booked = courts.reduce((n, c) => n + c.slots.filter((s) => s.status === "booked").length, 0);
  const open = courts.reduce((n, c) => n + c.slots.filter((s) => s.status === "free").length, 0);

  return (
    <Screen title="Calendar" kicker={venue.data?.name} refreshing={avail.refreshing} onRefresh={avail.refresh}>
      <Pills
        label="Day"
        options={days.map((d, i) => ({ id: d, label: i < 2 ? relativeDay(d, today) : `${weekdayShort(d)} ${dayOfMonth(d)}` }))}
        value={date}
        onChange={setDate}
      />
      {avail.error ? (
        <ErrorState error={avail.error} onRetry={avail.refresh} />
      ) : !avail.data ? (
        <Loading label="Loading calendar" />
      ) : (
        <>
          <Text style={[text.bodyStrong, { color: colors.ink }]}>
            {booked} booked {booked === 1 ? "hour" : "hours"} · {open} open
          </Text>
          <Grid courts={courts} date={date} />
        </>
      )}
      <Pressable accessibilityRole="button" onPress={() => setOwnerVenue(null)} hitSlop={8}>
        <Text style={[text.bodyStrong, { color: colors.turf, textDecorationLine: "underline" }]}>Change venue</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", marginBottom: space.xs },
  head: { width: CELL_W, color: colors.ink, paddingHorizontal: 4 },
  row: { flexDirection: "row", marginBottom: 4 },
  hour: { width: HOUR_W, justifyContent: "center", paddingLeft: 4, borderRadius: radius.control, marginRight: 4 },
  hourNow: { backgroundColor: colors.floodlight },
  cell: {
    width: CELL_W - 4,
    height: 40,
    marginRight: 4,
    borderRadius: radius.control,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  booked: { backgroundColor: colors.turf, borderColor: colors.turf },
  past: { opacity: 0.45 },
  closed: { backgroundColor: colors.sand, borderColor: colors.sand },
});
