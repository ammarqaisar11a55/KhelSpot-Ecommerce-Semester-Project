import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatRupees } from "@shared/domain/pricing";
import { formatWhen, isPast } from "@shared/domain/time";
import type { Booking, Venue } from "@shared/domain/types";
import { api } from "@/api/client";
import { useQuery } from "@/api/useQuery";
import { ChevronIcon } from "@/components/icons";
import { Empty, ErrorState, Loading } from "@/components/kit";
import { Button, Label, Screen, Tag } from "@/components/ui";
import { usePlayer } from "@/player/store";
import { colors, radius, space, text } from "@/theme";

function Row({ b, venue }: { b: Booking; venue?: Venue }) {
  const court = venue?.courts.find((c) => c.id === b.courtId);
  const cancelled = b.status === "cancelled";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/booked/[ref]", params: { ref: b.ref } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.sand }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[text.label, styles.slate]}>{formatWhen(b.date, b.start, b.hours)}</Text>
        <Text style={[text.subhead, styles.ink, cancelled && { textDecorationLine: "line-through", color: colors.slate }]}>
          {venue?.name ?? "Venue"}
        </Text>
        <Text style={[text.body, styles.slate, { fontSize: 14, lineHeight: 20 }]}>
          {court?.name ?? "Court"} · {formatRupees(b.price)} · {b.ref}
        </Text>
      </View>
      {cancelled ? <Tag label="Cancelled" tone="line" /> : null}
      <ChevronIcon color={colors.slate} />
    </Pressable>
  );
}

export default function BookingsScreen() {
  const player = usePlayer();
  const key = player.bookings.map((b) => b.ref).join(",");
  const q = useQuery(key ? `mine|${key}` : null, async () => {
    const [venues, results] = await Promise.all([
      api.venues(),
      Promise.allSettled(player.bookings.map((s) => api.booking(s.ref, s.phone))),
    ]);
    const bookings = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    // If every lookup failed, surface the reason instead of an empty list.
    const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    if (!bookings.length && firstError) throw firstError.reason;
    return { venues: new Map(venues.map((v) => [v.id, v])), bookings };
  });

  const all = q.data?.bookings ?? [];
  const upcoming = all
    .filter((b) => b.status === "confirmed" && !isPast(b.date, b.start + b.hours))
    .sort((a, b) => (a.date + String(a.start).padStart(2, "0")).localeCompare(b.date + String(b.start).padStart(2, "0")));
  const past = all.filter((b) => !upcoming.includes(b));

  return (
    <Screen title="My bookings" refreshing={q.refreshing} onRefresh={key ? q.refresh : undefined}>
      {!key ? (
        <Empty title="No bookings yet">
          <Text style={[text.body, styles.slate]}>
            Courts you book show up here with the court, time and price, and the time until which you can cancel for a full
            refund.
          </Text>
          <Button label="Find a court" onPress={() => router.navigate("/player")} style={{ marginTop: space.sm }} />
        </Empty>
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : q.loading ? (
        <Loading label="Loading bookings" />
      ) : (
        <>
          <View style={{ gap: space.sm }}>
            <Label>Upcoming</Label>
            {upcoming.length ? (
              <View style={styles.group}>
                {upcoming.map((b) => (
                  <Row key={b.ref} b={b} venue={q.data?.venues.get(b.venueId)} />
                ))}
              </View>
            ) : (
              <Text style={[text.body, styles.slate]}>Nothing coming up.</Text>
            )}
          </View>
          {past.length ? (
            <View style={{ gap: space.sm }}>
              <Label>Past and cancelled</Label>
              <View style={styles.group}>
                {past.map((b) => (
                  <Row key={b.ref} b={b} venue={q.data?.venues.get(b.venueId)} />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ink: { color: colors.ink },
  slate: { color: colors.slate },
  group: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 2, borderColor: colors.line, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});
