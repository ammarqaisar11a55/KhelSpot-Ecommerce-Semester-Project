import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatRupees, priceFor, rateAt } from "@shared/domain/pricing";
import { addDays, dayOfMonth, formatRange, operatingNow, relativeDay, weekdayShort } from "@shared/domain/time";
import { ApiError, owner } from "@/api/client";
import { invalidateQueries, useQuery } from "@/api/useQuery";
import { haptic } from "@/components/motion";
import { ErrorState, Loading, Pills } from "@/components/kit";
import { SlotGrid } from "@/components/SlotGrid";
import { Button, Label } from "@/components/ui";
import { courtDay } from "@/owner/day";
import { useOwnerVenue } from "@/owner/store";
import { fonts, radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

const normalisePhone = (raw: string) => {
  const c = raw.replace(/[\s-]/g, "");
  return c.startsWith("+92") ? `0${c.slice(3)}` : c;
};

/** Walk-in or phone booking taken by the venue. Prefilled from a tapped calendar cell. */
export default function WalkIn() {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const params = useLocalSearchParams<{ courtId?: string; date?: string; start?: string }>();
  const mine = useOwnerVenue();
  const today = operatingNow().date;
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const [date, setDate] = useState(params.date ?? today);
  const [courtId, setCourtId] = useState<string | undefined>(params.courtId);
  const [start, setStart] = useState<number | null>(params.start ? Number(params.start) : null);
  const [hours, setHours] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);

  const day = useQuery(mine ? `owner-day|${mine.venueId}|${date}` : null, async () => {
    const [venue, bookings] = await Promise.all([owner.venue(mine!.venueId), owner.bookings(mine!.venueId, date, date)]);
    return { venue, bookings };
  });

  if (!mine) return <View style={styles.pad}><ErrorState error={new ApiError("UNAUTHENTICATED", "Sign in to your venue first.")} /></View>;
  if (day.error) return <View style={styles.pad}><ErrorState error={day.error} onRetry={day.refresh} /></View>;
  if (!day.data) return <Loading label="Loading courts" />;

  const { venue, bookings } = day.data;
  const court = venue.courts.find((c) => c.id === courtId) ?? venue.courts[0];
  const cells = courtDay(venue, court, bookings, date);
  const slots = cells.map((c) => ({
    hour: c.hour,
    price: rateAt(venue.pricing[court.sport], c.hour)?.price,
    status: c.status === "open" ? ("free" as const) : c.status === "closed" ? ("no-rate" as const) : c.status === "past" ? ("past" as const) : ("booked" as const),
  }));
  let fit = 0;
  if (start !== null) {
    for (const c of cells) {
      if (c.hour < start) continue;
      if (c.hour !== start + fit || c.status !== "open" || fit === 3) break;
      fit++;
    }
  }
  const len = Math.min(hours, Math.max(fit, 1));
  const price = start !== null && fit > 0 ? priceFor(venue.pricing[court.sport], start, len) : null;

  const submit = async () => {
    const clean = normalisePhone(phone);
    if (!name.trim()) return setFailure(new ApiError("NAME", "Add the player's name."));
    if (!/^03\d{9}$/.test(clean)) return setFailure(new ApiError("PHONE", "Use a Pakistani mobile number, like 0300 1234567."));
    if (start === null || fit === 0) return setFailure(new ApiError("TIME", "Pick an open start time."));
    setBusy(true);
    setFailure(null);
    try {
      const b = await owner.walkIn({
        venueId: venue.id,
        courtId: court.id,
        date,
        start,
        hours: len,
        customer: { name: name.trim(), phone: clean },
        payment: "cash",
        paid,
      });
      invalidateQueries("owner-");
      invalidateQueries("avail|");
      haptic.success();
      router.replace({ pathname: "/manage/booking/[ref]", params: { ref: b.ref } });
    } catch (e) {
      setFailure(e instanceof ApiError ? e : new ApiError("UNKNOWN", "Couldn't add the booking. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.pad, { gap: space.lg }]} keyboardShouldPersistTaps="handled">
        <Pills
          label="Day"
          options={days.map((d, i) => ({ id: d, label: i < 2 ? relativeDay(d, today) : `${weekdayShort(d)} ${dayOfMonth(d)}` }))}
          value={date}
          onChange={(d) => {
            setDate(d);
            setStart(null);
          }}
        />
        <Pills
          label="Court"
          options={venue.courts.map((c) => ({ id: c.id, label: c.name }))}
          value={court.id}
          onChange={(id) => {
            setCourtId(id);
            setStart(null);
          }}
        />
        <SlotGrid slots={slots} selected={start} hours={len} onSelect={(h) => { setStart(h); setHours(1); }} />
        {start !== null && fit > 0 ? (
          <Pills
            label="Hours"
            options={[1, 2, 3].filter((n) => n <= fit).map((n) => ({ id: String(n), label: n === 1 ? "1 hour" : `${n} hours` }))}
            value={String(len)}
            onChange={(n) => setHours(Number(n))}
          />
        ) : null}

        <View style={{ gap: 6 }}>
          <Label color={c.text}>Player&apos;s name</Label>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Ali Raza" placeholderTextColor={c.textMuted} accessibilityLabel="Player's name" />
          <Label color={c.text}>Mobile number</Label>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="0300 1234567"
            placeholderTextColor={c.textMuted}
            accessibilityLabel="Mobile number"
          />
        </View>

        <Pressable accessibilityRole="switch" accessibilityState={{ checked: paid }} onPress={() => setPaid((p) => !p)} style={styles.toggle}>
          <View style={[styles.track, paid && styles.trackOn]}>
            <View style={[styles.knob, paid && styles.knobOn]} />
          </View>
          <Text style={[text.bodyStrong, { color: c.text, flex: 1 }]}>Cash already taken</Text>
        </Pressable>

        {failure ? <ErrorState error={failure} /> : null}
        <Button
          label={price !== null && start !== null ? `Book ${court.name} · ${formatRange(start, len)} · ${formatRupees(price)}` : "Book"}
          busy={busy}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  pad: { padding: space.xl, paddingBottom: space.xxl * 2, backgroundColor: c.bg, flexGrow: 1 },
  input: {
    borderWidth: 2,
    borderColor: c.strong,
    borderRadius: radius.control,
    backgroundColor: c.surface,
    paddingHorizontal: space.md,
    minHeight: 52,
    fontFamily: fonts.text400,
    fontSize: 16,
    color: c.text,
    marginBottom: space.sm,
  },
  toggle: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 44 },
  track: { width: 48, height: 28, borderRadius: 14, backgroundColor: c.border, padding: 3 },
  trackOn: { backgroundColor: c.turf },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.surface },
  knobOn: { transform: [{ translateX: 20 }] },
});
