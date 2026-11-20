import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { lowestRate, formatRupees } from "@shared/domain/pricing";
import { addDays, formatHour, operatingNow, relativeDay, weekdayShort, dayOfMonth } from "@shared/domain/time";
import { SPORT_LABEL, SPORTS, type Sport, type Venue } from "@shared/domain/types";
import { api, type Availability } from "@/api/client";
import { primeQuery, useQuery } from "@/api/useQuery";
import { Empty, ErrorState, Pills, VenuePhoto } from "@/components/kit";
import { PressableScale, Skeleton, VenueCardSkeleton } from "@/components/motion";
import { Screen } from "@/components/ui";
import { radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

type SportFilter = Sport | "all";

const SPORT_OPTIONS: { id: SportFilter; label: string }[] = [
  { id: "all", label: "All sports" },
  ...SPORTS.map((s) => ({ id: s, label: SPORT_LABEL[s] })),
];

/** Open start times across the courts that match the sport, earliest first, with how many courts are open. */
function openTimes(av: Availability | undefined, sport: SportFilter) {
  const byHour = new Map<number, { count: number; price: number }>();
  for (const c of av?.courts ?? []) {
    if (sport !== "all" && c.sport !== sport) continue;
    for (const s of c.slots) {
      if (s.status !== "free") continue;
      const cur = byHour.get(s.hour);
      byHour.set(s.hour, { count: (cur?.count ?? 0) + 1, price: Math.min(cur?.price ?? Infinity, s.price ?? Infinity) });
    }
  }
  return [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([hour, v]) => ({ hour, ...v }));
}

function VenueCard({ venue, av, sport, date }: { venue: Venue; av?: Availability; sport: SportFilter; date: string }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const sports = [...new Set(venue.courts.map((c) => c.sport))];
  const shownSport = sport === "all" ? undefined : sport;
  const from = Math.min(
    ...sports.filter((s) => !shownSport || s === shownSport).map((s) => lowestRate(venue.pricing[s]) ?? Infinity),
  );
  const times = openTimes(av, sport);
  const open = (hour?: number) =>
    router.push({
      pathname: "/venue/[slug]",
      params: { slug: venue.slug, date, ...(shownSport ? { sport: shownSport } : {}), ...(hour !== undefined ? { hour: String(hour) } : {}) },
    });

  return (
    <View style={styles.card}>
      <PressableScale accessibilityRole="button" accessibilityLabel={`${venue.name}, ${venue.area}`} onPress={() => open()} depth={0.985}>
        <VenuePhoto src={venue.photo?.src} alt={venue.photo?.alt} height={150} area={venue.area} />
        <View style={styles.cardBody}>
          <Text style={[text.label, { color: c.textMuted }]}>
            {venue.area} · {sports.map((s) => SPORT_LABEL[s]).join(", ")}
          </Text>
          <Text style={[text.heading, styles.ink, { fontSize: 28, lineHeight: 30 }]}>{venue.name}</Text>
          {Number.isFinite(from) ? (
            <Text style={[text.bodyStrong, styles.ink]}>
              From {formatRupees(from)} <Text style={[text.body, styles.slate]}>an hour</Text>
            </Text>
          ) : null}
        </View>
      </PressableScale>
      <View style={styles.times}>
        {av === undefined ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} width={64} height={36} />)
        ) : times.length === 0 ? (
          <Text style={[text.body, styles.slate, styles.small]}>Full {relativeDay(date, operatingNow().date).toLowerCase()}. Try another day.</Text>
        ) : (
          times.slice(0, 8).map((t) => (
            <PressableScale
              key={t.hour}
              depth={0.92}
              accessibilityRole="button"
              accessibilityLabel={`${formatHour(t.hour)}, ${t.count} court${t.count > 1 ? "s" : ""} open`}
              onPress={() => open(t.hour)}
              style={styles.time}
            >
              <Text style={[text.bodyStrong, { color: c.ink, fontSize: 14, lineHeight: 18 }]}>{formatHour(t.hour)}</Text>
            </PressableScale>
          ))
        )}
      </View>
    </View>
  );
}

export default function CourtsScreen() {
  const styles = useStyles(makeStyles);
  const today = operatingNow().date;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [date, setDate] = useState(today);
  const [sport, setSport] = useState<SportFilter>("all");

  const venues = useQuery("venues", () => api.venues());
  const avail = useQuery(venues.data ? `avail|${date}|${venues.data.map((v) => v.slug).join(",")}` : null, async () => {
    const list = venues.data ?? [];
    const results = await Promise.allSettled(list.map((v) => api.availability(v.slug, date)));
    // The venue page opens with this data already on screen.
    list.forEach((v, i) => {
      primeQuery(`venue|${v.slug}`, v);
      const r = results[i];
      if (r.status === "fulfilled") primeQuery(`avail|${v.slug}|${date}`, r.value);
    });
    return Object.fromEntries(list.map((v, i) => [v.id, results[i].status === "fulfilled" ? results[i].value : undefined]));
  });

  const shown = (venues.data ?? []).filter((v) => sport === "all" || v.courts.some((c) => c.sport === sport));
  const refresh = () => {
    venues.refresh();
    avail.refresh();
  };

  return (
    <Screen kicker="Aaj raat khelna hai?" title={"Free courts\nin Lahore"} refreshing={venues.refreshing || avail.refreshing} onRefresh={refresh}>
      <Pills label="Sport" options={SPORT_OPTIONS} value={sport} onChange={setSport} />
      <Pills
        label="Day"
        options={days.map((d, i) => ({ id: d, label: i < 2 ? relativeDay(d, today) : `${weekdayShort(d)} ${dayOfMonth(d)}` }))}
        value={date}
        onChange={setDate}
      />

      {venues.error ? (
        <ErrorState error={venues.error} onRetry={venues.refresh} />
      ) : venues.loading ? (
        <>
          <VenueCardSkeleton />
          <VenueCardSkeleton />
        </>
      ) : shown.length === 0 ? (
        <Empty title={`No ${sport === "all" ? "" : SPORT_LABEL[sport as Sport].toLowerCase() + " "}courts listed yet`}>
          <Text style={[text.body, styles.slate]}>More Lahore venues are joining. Try another sport.</Text>
        </Empty>
      ) : (
        shown.map((v) => <VenueCard key={v.id} venue={v} av={avail.data?.[v.id]} sport={sport} date={date} />)
      )}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  ink: { color: c.text },
  slate: { color: c.textMuted },
  small: { fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: c.border,
    overflow: "hidden",
  },
  cardBody: { padding: space.lg, paddingBottom: space.sm, gap: space.xs },
  times: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.lg, paddingTop: space.sm },
  time: {
    backgroundColor: c.floodlight,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: "center",
  },
});
