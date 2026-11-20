import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatRupees } from "@shared/domain/pricing";
import { formatHour, formatRange, operatingNow } from "@shared/domain/time";
import type { Booking, Venue } from "@shared/domain/types";
import { ApiError, owner } from "@/api/client";
import { invalidateQueries, useQuery } from "@/api/useQuery";
import { haptic } from "@/components/motion";
import { ChevronIcon } from "@/components/icons";
import { ErrorState, Loading } from "@/components/kit";
import { Button, Card, Label, Screen, Tag } from "@/components/ui";
import { isLive } from "@/owner/day";
import { OwnerGate } from "@/owner/OwnerGate";
import type { OwnedVenue } from "@/owner/store";
import { space, text, useStyles, usePalette, type Palette } from "@/theme";

function BookingLine({ b, venue, right }: { b: Booking; venue: Venue; right?: React.ReactNode }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const court = venue.courts.find((c) => c.id === b.courtId);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/manage/booking/[ref]", params: { ref: b.ref } })}
      style={({ pressed }) => [styles.line, pressed && { opacity: 0.7 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[text.bodyStrong, styles.ink]}>
          {formatRange(b.start, b.hours)} · {court?.name ?? "Court"}
        </Text>
        <Text style={[text.body, styles.slate, styles.small]}>
          {b.customer.name} · {b.customer.phone}
          {b.source === "walk-in" ? " · walk-in" : ""}
        </Text>
      </View>
      {right ?? <ChevronIcon color={c.textMuted} />}
    </Pressable>
  );
}

function Today({ v }: { v: OwnedVenue }) {
  const styles = useStyles(makeStyles);
  const now = operatingNow();
  const day = useQuery(`owner-day|${v.venueId}|${now.date}`, async () => {
    const [venue, bookings] = await Promise.all([owner.venue(v.venueId), owner.bookings(v.venueId, now.date, now.date)]);
    return { venue, bookings };
  });
  const [paying, setPaying] = useState<string | null>(null);
  const [failure, setFailure] = useState<ApiError | null>(null);

  if (day.error) return <ErrorState error={day.error} onRetry={day.refresh} />;
  if (!day.data) return <Loading label="Loading today" />;
  const { venue, bookings } = day.data;
  const live = bookings.filter(isLive).sort((a, b) => a.start - b.start);
  const onNow = live.filter((b) => b.start <= now.hour && now.hour < b.start + b.hours);
  const next = live.filter((b) => b.start > now.hour);
  const unpaid = live.filter((b) => b.status === "confirmed" && !b.paid);
  const takings = bookings.filter((b) => b.status === "confirmed" && b.paid).reduce((s, b) => s + b.price, 0);

  const markPaid = async (b: Booking) => {
    setPaying(b.ref);
    setFailure(null);
    try {
      await owner.markPaid(b.ref);
      invalidateQueries("owner-");
      haptic.success();
      day.refresh();
    } catch (e) {
      setFailure(e instanceof ApiError ? e : new ApiError("UNKNOWN", "Couldn't mark it paid."));
    } finally {
      setPaying(null);
    }
  };

  return (
    <>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[text.display, styles.ink]}>{onNow.length}</Text>
          <Label>On court</Label>
        </View>
        <View style={styles.stat}>
          <Text style={[text.display, styles.ink]}>{next.length}</Text>
          <Label>Still to come</Label>
        </View>
        <View style={styles.stat}>
          <Text style={[text.heading, styles.ink, { textTransform: "none", fontSize: 26, lineHeight: 43 }]}>{formatRupees(takings)}</Text>
          <Label>Paid today</Label>
        </View>
      </View>

      <Button label="Add a walk-in" onPress={() => router.push("/manage/walk-in")} />

      <Card>
        <Label>On court now</Label>
        {onNow.length ? (
          onNow.map((b) => <BookingLine key={b.ref} b={b} venue={venue} right={<Text style={[text.label, styles.slate]}>till {formatHour(b.start + b.hours)}</Text>} />)
        ) : (
          <Text style={[text.body, styles.slate]}>No one right now.</Text>
        )}
      </Card>

      <Card>
        <Label>Unpaid at venue</Label>
        {failure ? <ErrorState error={failure} /> : null}
        {unpaid.length ? (
          unpaid.map((b) => (
            <BookingLine
              key={b.ref}
              b={b}
              venue={venue}
              right={
                <Button
                  kind="outline"
                  label={`Paid ${formatRupees(b.price)}`}
                  busy={paying === b.ref}
                  onPress={() => markPaid(b)}
                  style={{ minHeight: 40, paddingHorizontal: space.md }}
                />
              }
            />
          ))
        ) : (
          <Text style={[text.body, styles.slate]}>Nothing to collect.</Text>
        )}
      </Card>

      <Card>
        <Label>Next arrivals</Label>
        {next.length ? (
          next.slice(0, 8).map((b) => (
            <View key={b.ref} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              {b.status === "pending_payment" ? <Tag label="Paying" tone="line" /> : null}
              <View style={{ flex: 1 }}>
                <BookingLine b={b} venue={venue} />
              </View>
            </View>
          ))
        ) : (
          <Text style={[text.body, styles.slate]}>Nothing else booked today.</Text>
        )}
      </Card>
    </>
  );
}

export default function OwnerToday() {
  return (
    <Screen kicker="Tonight at your venue" title="Today">
      <OwnerGate>{(v) => <Today v={v} />}</OwnerGate>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  ink: { color: c.text },
  slate: { color: c.textMuted },
  small: { fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: "row", gap: space.md },
  stat: { flex: 1, borderTopWidth: 2, borderTopColor: c.strong, paddingTop: space.sm, gap: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: c.border },
});
