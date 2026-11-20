import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { formatHour, formatRange, operatingNow } from "@shared/domain/time";
import { api, type CourtAvailability } from "@/api/client";
import { useQuery } from "@/api/useQuery";
import { ErrorState, Loading } from "@/components/kit";
import { Button, Card, Label, Screen } from "@/components/ui";
import { useOwnerVenue } from "@/owner/store";
import { VenuePicker } from "@/owner/VenuePicker";
import { colors, space, text } from "@/theme";

/** Booked hours on one court merged into runs: 19, 20, 21 -> 7–10 PM. */
function bookedRuns(c: CourtAvailability) {
  const runs: { start: number; hours: number }[] = [];
  for (const s of c.slots) {
    if (s.status !== "booked") continue;
    const last = runs[runs.length - 1];
    if (last && last.start + last.hours === s.hour) last.hours++;
    else runs.push({ start: s.hour, hours: 1 });
  }
  return runs;
}

export default function OwnerToday() {
  const slug = useOwnerVenue();
  const now = operatingNow();
  const venue = useQuery(slug ? `venue|${slug}` : null, () => api.venue(slug!));
  const avail = useQuery(slug ? `avail|${slug}|${now.date}` : null, () => api.availability(slug!, now.date));

  if (!slug) {
    return (
      <Screen kicker="Tonight at your venue" title="Today">
        <VenuePicker />
      </Screen>
    );
  }

  const courts = avail.data?.courts ?? [];
  const onNow = courts.flatMap((c) =>
    bookedRuns(c)
      .filter((r) => r.start <= now.hour && now.hour < r.start + r.hours)
      .map((r) => ({ court: c.name, ...r })),
  );
  const next = courts
    .flatMap((c) => bookedRuns(c).filter((r) => r.start > now.hour).map((r) => ({ court: c.name, ...r })))
    .sort((a, b) => a.start - b.start)
    .slice(0, 6);
  const openLeft = courts.reduce((n, c) => n + c.slots.filter((s) => s.status === "free").length, 0);

  return (
    <Screen kicker={venue.data?.name ?? "Tonight at your venue"} title="Today" refreshing={avail.refreshing} onRefresh={avail.refresh}>
      {avail.error ? (
        <ErrorState error={avail.error} onRetry={avail.refresh} />
      ) : !avail.data ? (
        <Loading label="Loading today" />
      ) : (
        <>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[text.display, styles.ink]}>{onNow.length}</Text>
              <Label>On court now</Label>
            </View>
            <View style={styles.stat}>
              <Text style={[text.display, styles.ink]}>{next.length}</Text>
              <Label>Still to come</Label>
            </View>
            <View style={styles.stat}>
              <Text style={[text.display, styles.ink]}>{openLeft}</Text>
              <Label>Open hours left</Label>
            </View>
          </View>

          <Card>
            <Label>On court now</Label>
            {onNow.length ? (
              onNow.map((r) => (
                <Text key={r.court} style={[text.bodyStrong, styles.ink]}>
                  {r.court} · until {formatHour(r.start + r.hours)}
                </Text>
              ))
            ) : (
              <Text style={[text.body, styles.slate]}>No one right now.</Text>
            )}
          </Card>

          <Card>
            <Label>Next arrivals</Label>
            {next.length ? (
              next.map((r) => (
                <Text key={`${r.court}-${r.start}`} style={[text.bodyStrong, styles.ink]}>
                  {formatRange(r.start, r.hours)} · {r.court}
                </Text>
              ))
            ) : (
              <Text style={[text.body, styles.slate]}>Nothing else booked today.</Text>
            )}
          </Card>

          <Button kind="outline" label="Open the calendar" onPress={() => router.navigate("/owner/calendar")} />
          <Text style={[text.body, styles.slate, { fontSize: 14, lineHeight: 20 }]}>
            Names, numbers, unpaid cash and walk-ins arrive with owner sign-in. Until then, use the web dashboard for those.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ink: { color: colors.ink },
  slate: { color: colors.slate },
  stats: { flexDirection: "row", gap: space.md },
  stat: { flex: 1, borderTopWidth: 2, borderTopColor: colors.ink, paddingTop: space.sm, gap: 2 },
});
