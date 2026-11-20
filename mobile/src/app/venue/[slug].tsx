import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatRupees, refundLine } from "@shared/domain/pricing";
import { addDays, dayOfMonth, formatRange, operatingNow, relativeDay, weekdayShort } from "@shared/domain/time";
import { SPORT_LABEL, type Sport } from "@shared/domain/types";
import { api, type Slot } from "@/api/client";
import { useQuery } from "@/api/useQuery";
import { ErrorState, Loading, Pills, VenuePhoto } from "@/components/kit";
import { SlotGrid, SlotLegend } from "@/components/SlotGrid";
import { Button, Label } from "@/components/ui";
import { colors, radius, space, text } from "@/theme";

/** Longest run (max 3 hours) of open slots from `start`. */
function maxHoursFrom(slots: Slot[], start: number) {
  let n = 0;
  for (const s of slots) {
    if (s.hour < start) continue;
    if (s.hour !== start + n || s.status !== "free") break;
    if (++n === 3) break;
  }
  return n;
}

export default function VenueScreen() {
  const params = useLocalSearchParams<{ slug: string; date?: string; sport?: Sport; hour?: string }>();
  const insets = useSafeAreaInsets();
  const today = operatingNow().date;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const venue = useQuery(`venue|${params.slug}`, () => api.venue(params.slug));
  const [date, setDate] = useState(params.date && params.date >= today ? params.date : today);
  const avail = useQuery(`avail|${params.slug}|${date}`, () => api.availability(params.slug, date));

  const v = venue.data;
  const sports = v ? [...new Set(v.courts.map((c) => c.sport))] : [];
  const [sportPick, setSport] = useState<Sport | undefined>(params.sport);
  const sport = sportPick && sports.includes(sportPick) ? sportPick : sports[0];
  const courts = (avail.data?.courts ?? []).filter((c) => c.sport === sport);

  // The hour picked on the Courts list: start on the first court that has it open.
  const wantedHour = params.hour ? Number(params.hour) : null;
  const [courtPick, setCourt] = useState<string | undefined>();
  const [startPick, setStart] = useState<number | null | undefined>();
  const [hoursPick, setHours] = useState(1);
  const firstWithWanted =
    wantedHour !== null && date === params.date ? courts.find((c) => c.slots.some((s) => s.hour === wantedHour && s.status === "free")) : undefined;
  const court = courts.find((c) => c.courtId === courtPick) ?? firstWithWanted ?? courts[0];
  const start = startPick !== undefined ? startPick : firstWithWanted && court?.courtId === firstWithWanted.courtId ? wantedHour : null;
  const fit = court && start != null ? maxHoursFrom(court.slots, start) : 0;
  const hours = Math.min(hoursPick, Math.max(fit, 1));
  const price =
    court && start != null && fit > 0
      ? court.slots.filter((s) => s.hour >= start && s.hour < start + hours).reduce((sum, s) => sum + (s.price ?? 0), 0)
      : null;

  const resetPick = () => {
    setStart(null);
    setHours(1);
  };

  if (venue.error) {
    return (
      <View style={[styles.screen, styles.pad]}>
        <ErrorState error={venue.error} onRetry={venue.refresh} />
      </View>
    );
  }
  if (!v) return <Loading label="Loading venue" />;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: v.name }} />
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl * 3 }}>
        <VenuePhoto src={v.photo?.src} alt={v.photo?.alt} height={200} area={v.area} />
        {v.photo?.credit ? (
          <Text style={[styles.credit]} numberOfLines={1}>
            Photo: {v.photo.credit}
          </Text>
        ) : null}
        <View style={[styles.pad, { gap: space.lg }]}>
          <View style={{ gap: space.xs }}>
            <Label>{v.area}, Lahore</Label>
            <Text style={[text.heading, styles.ink]}>{v.name}</Text>
            <Text style={[text.body, styles.slate]}>{v.address}</Text>
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={() =>
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name}, ${v.address}, Lahore`)}`)
              }
            >
              <Text style={[text.bodyStrong, styles.link]}>Get directions</Text>
            </Pressable>
          </View>

          {sports.length > 1 ? (
            <Pills
              label="Sport"
              options={sports.map((s) => ({ id: s, label: SPORT_LABEL[s] }))}
              value={sport!}
              onChange={(s) => {
                setSport(s);
                setCourt(undefined);
                resetPick();
              }}
            />
          ) : null}
          <Pills
            label="Day"
            options={days.map((d, i) => ({ id: d, label: i < 2 ? relativeDay(d, today) : `${weekdayShort(d)} ${dayOfMonth(d)}` }))}
            value={date}
            onChange={(d) => {
              setDate(d);
              resetPick();
            }}
          />
          {courts.length > 1 ? (
            <Pills
              label="Court"
              options={courts.map((c) => ({ id: c.courtId, label: c.name }))}
              value={court?.courtId ?? ""}
              onChange={(id) => {
                setCourt(id);
                resetPick();
              }}
            />
          ) : null}

          {avail.error ? (
            <ErrorState error={avail.error} onRetry={avail.refresh} />
          ) : !court ? (
            <Loading label="Loading open times" />
          ) : (
            <View style={{ gap: space.md }}>
              <SlotLegend />
              <SlotGrid
                slots={court.slots}
                selected={start}
                hours={hours}
                onSelect={(h) => {
                  setStart(h);
                  setHours(1);
                }}
              />
            </View>
          )}

          {court && start != null && fit > 0 ? (
            <View style={styles.summary}>
              <Label>How long</Label>
              <Pills
                label="Hours"
                options={[1, 2, 3].filter((n) => n <= fit).map((n) => ({ id: String(n), label: n === 1 ? "1 hour" : `${n} hours` }))}
                value={String(hours)}
                onChange={(n) => setHours(Number(n))}
              />
              <Text style={[text.subhead, styles.ink]}>
                {court.name} · {formatRange(start, hours)}
              </Text>
              <Text style={[text.body, styles.slate, { fontSize: 14, lineHeight: 20 }]}>
                {refundLine(date, start, v.cancellation)}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {court && start != null && price !== null ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={[text.label, { color: colors.mutedOnInk }]}>{relativeDay(date, today)}</Text>
            <Text style={[text.heading, { color: colors.chalk, fontSize: 26, lineHeight: 28, textTransform: "none" }]}>{formatRupees(price)}</Text>
          </View>
          <Button
            kind="dark"
            label="Continue"
            style={{ minWidth: 150 }}
            onPress={() =>
              router.push({
                pathname: "/checkout",
                params: { slug: v.slug, courtId: court.courtId, date, start: String(start), hours: String(hours) },
              })
            }
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.chalk },
  pad: { padding: space.xl },
  ink: { color: colors.ink },
  slate: { color: colors.slate },
  link: { color: colors.turf, textDecorationLine: "underline" },
  credit: { ...text.body, fontSize: 11, lineHeight: 14, color: colors.slate, paddingHorizontal: space.xl, paddingTop: 4 },
  summary: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.sm,
  },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
});
