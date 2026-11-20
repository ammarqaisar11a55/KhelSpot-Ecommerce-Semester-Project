import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { formatRupees, refundLine, refundQuote } from "@shared/domain/pricing";
import { formatDateTime, formatWhen, isPast } from "@shared/domain/time";
import { PAYMENT_LABEL } from "@shared/domain/types";
import { ApiError, api } from "@/api/client";
import { useQuery } from "@/api/useQuery";
import { ErrorState, Loading } from "@/components/kit";
import { Button, Card, Label, Tag } from "@/components/ui";
import { findSavedBooking } from "@/player/store";
import { colors, radius, space, text } from "@/theme";

/** Booking confirmation and detail, in the kit's message order: status, where and when, paid, ID, deadline. */
export default function Booked() {
  const { ref, fresh } = useLocalSearchParams<{ ref: string; fresh?: string }>();
  const saved = findSavedBooking(ref);
  const data = useQuery(saved ? `booking|${ref}` : null, async () => {
    const [booking, venue] = await Promise.all([api.booking(ref, saved!.phone), api.venue(saved!.venueSlug)]);
    return { booking, venue };
  });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);

  if (!saved) {
    return (
      <View style={styles.pad}>
        <ErrorState error={new ApiError("NOT_FOUND", "This booking wasn't made on this phone, so it can't be opened here.")} />
      </View>
    );
  }
  if (data.error) return <View style={styles.pad}><ErrorState error={data.error} onRetry={data.refresh} /></View>;
  if (!data.data) return <Loading label="Loading booking" />;

  const { booking: b, venue: v } = data.data;
  const court = v.courts.find((c) => c.id === b.courtId);
  const cancelled = b.status === "cancelled";
  const finished = isPast(b.date, b.start + b.hours);
  const quote = refundQuote(b, v.cancellation);
  const when = formatWhen(b.date, b.start, b.hours);
  const paidLine = b.paid
    ? `${formatRupees(b.price)} paid with ${PAYMENT_LABEL[b.payment]}`
    : `${formatRupees(b.price)} to pay at the venue`;

  const cancel = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await api.cancel(b.ref, saved.phone);
      setConfirming(false);
      data.refresh();
    } catch (e) {
      setFailure(e instanceof ApiError ? e : new ApiError("UNKNOWN", "Couldn't cancel. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.pad, { gap: space.lg }]}>
      <View style={styles.hero}>
        <Tag label={cancelled ? "Cancelled" : finished ? "Played" : "Booked"} tone={cancelled ? "line" : "turf"} />
        <Text style={[text.display, { color: colors.chalk, fontSize: 40, lineHeight: 38 }]}>
          {cancelled ? "Cancelled" : fresh ? "You're booked" : v.name}
        </Text>
        <Text style={[text.subhead, { color: colors.chalk }]}>
          {court?.name ?? "Court"} · {v.name}
        </Text>
        <Text style={[text.bodyStrong, { color: colors.floodlight }]}>{when}</Text>
      </View>

      <Card>
        <Label>Where</Label>
        <Text style={[text.body, styles.ink]}>{v.address}</Text>
        <Label>Payment</Label>
        <Text style={[text.bodyStrong, styles.ink]}>{paidLine}</Text>
        {cancelled ? (
          <Text style={[text.body, styles.ink]}>
            {b.refund ? `Refunded ${formatRupees(b.refund)} on ${formatDateTime(b.cancelledAt ?? b.createdAt)}.` : "No refund was due."}
          </Text>
        ) : null}
        <Label>Booking ID</Label>
        <Text style={[text.heading, styles.ink, { fontSize: 24, lineHeight: 26 }]}>{b.ref}</Text>
        {!cancelled && !finished ? (
          <>
            <Label>Cancelling</Label>
            <Text style={[text.bodyStrong, styles.ink]}>{refundLine(b.date, b.start, v.cancellation)}</Text>
          </>
        ) : null}
      </Card>

      <View style={styles.row}>
        <Button
          kind="outline"
          label="Directions"
          style={{ flex: 1 }}
          onPress={() =>
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name}, ${v.address}, Lahore`)}`)
          }
        />
        <Button
          kind="outline"
          label="Share"
          style={{ flex: 1 }}
          onPress={() =>
            Share.share({
              message: `${cancelled ? "Cancelled" : "Booked"}: ${court?.name ?? "Court"} at ${v.name}, ${when}. ${v.address}, ${v.area}. Booking ID ${b.ref}.`,
            })
          }
        />
      </View>

      {!cancelled && !finished && quote.canCancel ? (
        confirming ? (
          <View style={styles.confirm}>
            <Text style={[text.subhead, styles.ink]}>
              {quote.amount > 0 ? `Cancel and get ${formatRupees(quote.amount)} back?` : "Cancel this booking?"}
            </Text>
            <Text style={[text.body, styles.slate]}>
              {b.paid ? quote.reason : "Nothing was paid, so there is nothing to refund."}
            </Text>
            {failure ? <ErrorState error={failure} /> : null}
            <View style={styles.row}>
              <Button kind="outline" label="Keep it" style={{ flex: 1 }} onPress={() => setConfirming(false)} />
              <Button label="Cancel booking" busy={busy} style={{ flex: 1 }} onPress={cancel} />
            </View>
          </View>
        ) : (
          <Button kind="outline" label="Cancel booking" onPress={() => setConfirming(true)} />
        )
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: space.xl, paddingBottom: space.xxl * 2, backgroundColor: colors.chalk, flexGrow: 1 },
  ink: { color: colors.ink },
  slate: { color: colors.slate },
  hero: { backgroundColor: colors.ink, borderRadius: radius.card, padding: space.xl, gap: space.sm },
  row: { flexDirection: "row", gap: space.md },
  confirm: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    padding: space.lg,
    gap: space.md,
  },
});
