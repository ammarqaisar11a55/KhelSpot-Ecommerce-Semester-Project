import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import * as CalendarLegacy from "expo-calendar/legacy";
import { Linking, Platform, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { formatRupees, refundLine, refundQuote } from "@shared/domain/pricing";
import { formatDateTime, formatWhen, isPast, slotStart } from "@shared/domain/time";
import { PAYMENT_LABEL } from "@shared/domain/types";
import { ApiError, api } from "@/api/client";
import { invalidateQueries, useQuery } from "@/api/useQuery";
import { ErrorState, Loading } from "@/components/kit";
import { haptic, StampIn } from "@/components/motion";
import { Button, Card, Label, Tag } from "@/components/ui";
import { useSession } from "@/auth/session";
import { cancelGameReminder } from "@/lib/reminders";
import { findSavedBooking } from "@/player/store";
import { radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

/** Booking confirmation and detail, in the kit's message order: status, where and when, paid, ID, deadline. */
export default function Booked() {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const { ref, fresh } = useLocalSearchParams<{ ref: string; fresh?: string }>();
  const saved = findSavedBooking(ref);
  const { user } = useSession();
  // Bookings made on this phone carry their number; signed-in players' bookings use theirs.
  const phone = saved?.phone ?? user?.phone ?? null;
  const data = useQuery(phone ? `booking|${ref}` : null, async () => {
    const booking = await api.booking(ref, phone!);
    const venue = saved ? await api.venue(saved.venueSlug) : (await api.venues()).find((v) => v.id === booking.venueId);
    if (!venue) throw new ApiError("NOT_FOUND", "That venue isn't listed any more.");
    return { booking, venue };
  });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);

  if (!phone) {
    return (
      <View style={styles.pad}>
        <ErrorState error={new ApiError("NOT_FOUND", "Sign in with the number used to book to see this booking.")} />
      </View>
    );
  }
  if (data.error) return <View style={styles.pad}><ErrorState error={data.error} onRetry={data.refresh} /></View>;
  if (!data.data) return <Loading label="Loading booking" />;

  const { booking: b, venue: v } = data.data;
  const court = v.courts.find((c) => c.id === b.courtId);
  const cancelled = b.status === "cancelled";
  const pending = b.status === "pending_payment";
  const finished = isPast(b.date, b.start + b.hours);
  const quote = refundQuote(b, v.cancellation);
  const when = formatWhen(b.date, b.start, b.hours);
  const paidLine = pending
    ? `${formatRupees(b.price)} not paid yet. The court is held until the payment page times out.`
    : b.paid
    ? `${formatRupees(b.price)} paid with ${PAYMENT_LABEL[b.payment]}`
    : `${formatRupees(b.price)} to pay at the venue`;

  const cancel = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await api.cancel(b.ref, phone);
      await cancelGameReminder(b.ref);
      invalidateQueries("avail|");
      invalidateQueries("mine|");
      haptic.success();
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
      <StampIn
        play={!!fresh && !cancelled && !pending}
        tag={<Tag label={cancelled ? "Cancelled" : pending ? "Payment pending" : finished ? "Played" : "Booked"} tone={cancelled || pending ? "line" : "floodlight"} />}
      >
      <View style={styles.hero}>
        <Text style={[text.display, { color: c.chalk, fontSize: 40, lineHeight: 38 }]}>
          {cancelled ? "Cancelled" : pending ? "Not paid yet" : fresh ? "You're booked" : v.name}
        </Text>
        <Text style={[text.subhead, { color: c.chalk }]}>
          {court?.name ?? "Court"} · {v.name}
        </Text>
        <Text style={[text.bodyStrong, { color: c.floodlight }]}>{when}</Text>
      </View>
      </StampIn>

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
      {!cancelled && !finished && Platform.OS !== "web" ? (
        <Button
          kind="outline"
          label="Add to calendar"
          onPress={() =>
            // The phone's own "new event" screen: no calendar permission needed.
            CalendarLegacy.createEventInCalendarAsync({
              title: `${court?.name ?? "Court"} at ${v.name}`,
              startDate: slotStart(b.date, b.start),
              endDate: slotStart(b.date, b.start + b.hours),
              location: v.address,
              notes: `KhelSpot booking ${b.ref}. ${refundLine(b.date, b.start, v.cancellation)}`,
            }).catch(() => {})
          }
        />
      ) : null}

      {!cancelled && !pending && !finished && quote.canCancel ? (
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  pad: { padding: space.xl, paddingBottom: space.xxl * 2, backgroundColor: c.bg, flexGrow: 1 },
  ink: { color: c.text },
  slate: { color: c.textMuted },
  hero: { backgroundColor: c.stage, borderRadius: radius.card, padding: space.xl, gap: space.sm },
  row: { flexDirection: "row", gap: space.md },
  confirm: {
    borderWidth: 2,
    borderColor: c.strong,
    borderRadius: radius.card,
    backgroundColor: c.surface,
    padding: space.lg,
    gap: space.md,
  },
});
