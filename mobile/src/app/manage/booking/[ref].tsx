import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatRupees } from "@shared/domain/pricing";
import { formatDateTime, formatWhen, isPast } from "@shared/domain/time";
import { PAYMENT_LABEL } from "@shared/domain/types";
import { ApiError, owner } from "@/api/client";
import { invalidateQueries, useQuery } from "@/api/useQuery";
import { haptic } from "@/components/motion";
import { ErrorState, Loading } from "@/components/kit";
import { Button, Card, Label, Tag } from "@/components/ui";
import { callPlayer, whatsappPlayer } from "@/owner/contact";
import { useOwnerVenue } from "@/owner/store";
import { radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

/** One booking at the owner's venue: contact the player, mark cash paid, or cancel with a full refund. */
export default function OwnerBooking() {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const mine = useOwnerVenue();
  const q = useQuery(mine ? `owner-booking|${ref}` : null, async () => {
    const booking = await owner.booking(ref);
    const venue = await owner.venue(booking.venueId);
    return { booking, venue };
  });
  const [busy, setBusy] = useState<"paid" | "cancel" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);

  if (!mine) return <View style={styles.pad}><ErrorState error={new ApiError("UNAUTHENTICATED", "Sign in to your venue first.")} /></View>;
  if (q.error) return <View style={styles.pad}><ErrorState error={q.error} onRetry={q.refresh} /></View>;
  if (!q.data) return <Loading label="Loading booking" />;
  const { booking: b, venue } = q.data;
  const court = venue.courts.find((c) => c.id === b.courtId);
  const when = formatWhen(b.date, b.start, b.hours);
  const finished = isPast(b.date, b.start + b.hours);
  const status =
    b.status === "cancelled" ? "Cancelled" : b.status === "pending_payment" ? "Paying online" : finished ? "Played" : "Booked";

  const act = async (kind: "paid" | "cancel") => {
    setBusy(kind);
    setFailure(null);
    try {
      if (kind === "paid") await owner.markPaid(b.ref);
      else await owner.cancel(b.ref);
      setConfirming(false);
      invalidateQueries("owner-");
      invalidateQueries("avail|");
      haptic.success();
      q.refresh();
    } catch (e) {
      setFailure(e instanceof ApiError ? e : new ApiError("UNKNOWN", "That didn't go through. Try again."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.pad, { gap: space.lg }]}>
      <View style={styles.hero}>
        <Tag label={status} tone={b.status === "confirmed" ? "turf" : "line"} />
        <Text style={[text.heading, { color: c.chalk }]}>{b.customer.name}</Text>
        <Text style={[text.bodyStrong, { color: c.floodlight }]}>
          {court?.name ?? "Court"} · {when}
        </Text>
      </View>

      <View style={styles.row}>
        <Button kind="outline" label="Call" style={{ flex: 1 }} onPress={() => callPlayer(b.customer.phone)} />
        <Button
          kind="outline"
          label="WhatsApp"
          style={{ flex: 1 }}
          onPress={() =>
            whatsappPlayer(b.customer.phone, `Assalam o alaikum ${b.customer.name}, ${venue.name} here about your booking ${b.ref} (${court?.name}, ${when}).`)
          }
        />
      </View>

      <Card>
        <Label>Phone</Label>
        <Text style={[text.bodyStrong, styles.ink]}>{b.customer.phone}</Text>
        <Label>Payment</Label>
        <Text style={[text.bodyStrong, styles.ink]}>
          {formatRupees(b.price)} · {b.paid ? (b.payment === "cash" ? "paid in cash" : `paid with ${PAYMENT_LABEL[b.payment]}`) : b.status === "pending_payment" ? "payment in progress" : "to collect at the venue"}
        </Text>
        {b.status === "cancelled" ? (
          <Text style={[text.body, styles.ink]}>
            Cancelled {formatDateTime(b.cancelledAt ?? b.createdAt)}
            {b.refund ? `, ${formatRupees(b.refund)} refunded` : ""}.
          </Text>
        ) : null}
        <Label>Booking ID</Label>
        <Text style={[text.bodyStrong, styles.ink]}>
          {b.ref} · {b.source === "walk-in" ? "walk-in" : "booked online"} {formatDateTime(b.createdAt)}
        </Text>
      </Card>

      {failure ? <ErrorState error={failure} /> : null}

      {b.status === "confirmed" && !b.paid ? (
        <Button label={`Mark ${formatRupees(b.price)} as paid`} busy={busy === "paid"} onPress={() => act("paid")} />
      ) : null}

      {b.status !== "cancelled" && !finished ? (
        confirming ? (
          <View style={styles.confirm}>
            <Text style={[text.subhead, styles.ink]}>Cancel {b.customer.name}&apos;s booking?</Text>
            <Text style={[text.body, styles.slate]}>
              {b.paid ? `They get the full ${formatRupees(b.price)} back, because the venue is cancelling.` : "Nothing was paid, so there's nothing to refund."}{" "}
              Let them know on WhatsApp.
            </Text>
            <View style={styles.row}>
              <Button kind="outline" label="Keep it" style={{ flex: 1 }} onPress={() => setConfirming(false)} />
              <Button label="Cancel it" busy={busy === "cancel"} style={{ flex: 1 }} onPress={() => act("cancel")} />
            </View>
          </View>
        ) : (
          <Button kind="outline" label="Cancel booking" onPress={() => setConfirming(true)} />
        )
      ) : null}
      <Button kind="outline" label="Back to calendar" onPress={() => router.navigate("/owner/calendar")} />
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  pad: { padding: space.xl, paddingBottom: space.xxl * 2, backgroundColor: c.bg, flexGrow: 1 },
  ink: { color: c.text },
  slate: { color: c.textMuted },
  hero: { backgroundColor: c.stage, borderRadius: radius.card, padding: space.xl, gap: space.sm },
  row: { flexDirection: "row", gap: space.md },
  confirm: { borderWidth: 2, borderColor: c.strong, borderRadius: radius.card, backgroundColor: c.surface, padding: space.lg, gap: space.md },
});
