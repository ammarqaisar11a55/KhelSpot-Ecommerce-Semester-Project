import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatRupees } from "@shared/domain/pricing";
import { formatWhen, isPast } from "@shared/domain/time";
import type { Booking, Venue } from "@shared/domain/types";
import { api, auth } from "@/api/client";
import { useSession } from "@/auth/session";
import { useQuery } from "@/api/useQuery";
import { ChevronIcon } from "@/components/icons";
import { Empty, ErrorState, Loading } from "@/components/kit";
import { Button, Label, Screen, Tag } from "@/components/ui";
import { usePlayer } from "@/player/store";
import { radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

function Row({ b, venue }: { b: Booking; venue?: Venue }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const court = venue?.courts.find((c) => c.id === b.courtId);
  const cancelled = b.status === "cancelled";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/booked/[ref]", params: { ref: b.ref } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.subtle }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[text.label, styles.slate]}>{formatWhen(b.date, b.start, b.hours)}</Text>
        <Text style={[text.subhead, styles.ink, cancelled && { textDecorationLine: "line-through", color: c.textMuted }]}>
          {venue?.name ?? "Venue"}
        </Text>
        <Text style={[text.body, styles.slate, { fontSize: 14, lineHeight: 20 }]}>
          {court?.name ?? "Court"} · {formatRupees(b.price)} · {b.ref}
        </Text>
      </View>
      {cancelled ? <Tag label="Cancelled" tone="line" /> : null}
      <ChevronIcon color={c.textMuted} />
    </Pressable>
  );
}

export default function BookingsScreen() {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const player = usePlayer();
  const { user } = useSession();
  const key = [user?.phone ?? "", ...player.bookings.map((b) => b.ref)].join(",");
  const hasAny = !!user || player.bookings.length > 0;
  const q = useQuery(hasAny ? `mine|${key}` : null, async () => {
    const [venues, results, account] = await Promise.all([
      api.venues(),
      Promise.allSettled(player.bookings.map((s) => api.booking(s.ref, s.phone))),
      user ? auth.myBookings().catch(() => []) : Promise.resolve([]),
    ]);
    // Bookings on this phone plus, when signed in, everything booked with this number.
    const byRef = new Map<string, Booking>();
    for (const r of results) if (r.status === "fulfilled") byRef.set(r.value.ref, r.value);
    for (const b of account) byRef.set(b.ref, b);
    const bookings = [...byRef.values()];
    // If every lookup failed, surface the reason instead of an empty list.
    const firstError = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    if (!bookings.length && firstError) throw firstError.reason;
    return { venues: new Map(venues.map((v) => [v.id, v])), bookings };
  });

  const all = q.data?.bookings ?? [];
  const upcoming = all
    .filter((b) => b.status !== "cancelled" && !isPast(b.date, b.start + b.hours))
    .sort((a, b) => (a.date + String(a.start).padStart(2, "0")).localeCompare(b.date + String(b.start).padStart(2, "0")));
  const past = all.filter((b) => !upcoming.includes(b));

  return (
    <Screen title="My bookings" refreshing={q.refreshing} onRefresh={hasAny ? q.refresh : undefined}>
      {!user ? (
        <Pressable accessibilityRole="button" onPress={() => router.push("/sign-in")} style={styles.signIn}>
          <Text style={[text.bodyStrong, { color: c.ink, flex: 1 }]}>Sign in to see bookings made on other phones</Text>
          <ChevronIcon color={c.ink} />
        </Pressable>
      ) : null}
      {!hasAny ? (
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  ink: { color: c.text },
  slate: { color: c.textMuted },
  signIn: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: c.floodlight, borderRadius: radius.control, padding: space.md },
  group: { backgroundColor: c.surface, borderRadius: radius.card, borderWidth: 2, borderColor: c.border, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
});
