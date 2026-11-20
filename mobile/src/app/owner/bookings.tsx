import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatRupees } from "@shared/domain/pricing";
import { addDays, formatWhen, isPast, operatingNow } from "@shared/domain/time";
import type { Booking } from "@shared/domain/types";
import { owner } from "@/api/client";
import { useQuery } from "@/api/useQuery";
import { ChevronIcon } from "@/components/icons";
import { Empty, ErrorState, Loading, Pills } from "@/components/kit";
import { Screen, Tag } from "@/components/ui";
import { OwnerGate } from "@/owner/OwnerGate";
import type { OwnedVenue } from "@/owner/store";
import { fonts, radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

type Filter = "upcoming" | "unpaid" | "cancelled" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "unpaid", label: "To collect" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "Last 30 days" },
];

function List({ v }: { v: OwnedVenue }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const today = operatingNow().date;
  const from = addDays(today, -30);
  const to = addDays(today, 30);
  const q = useQuery(`owner-bookings|${v.venueId}|${from}|${to}`, async () => {
    const [venue, bookings] = await Promise.all([owner.venue(v.venueId), owner.bookings(v.venueId, from, to)]);
    return { venue, bookings };
  });
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [search, setSearch] = useState("");

  if (q.error) return <ErrorState error={q.error} onRetry={q.refresh} />;
  if (!q.data) return <Loading label="Loading bookings" />;
  const { venue, bookings } = q.data;

  const s = search.trim().toLowerCase().replace(/[\s-]/g, "");
  const ended = (b: Booking) => isPast(b.date, b.start + b.hours);
  const shown = bookings
    .filter((b) => {
      if (filter === "upcoming") return b.status !== "cancelled" && !ended(b);
      if (filter === "unpaid") return b.status === "confirmed" && !b.paid;
      if (filter === "cancelled") return b.status === "cancelled";
      return true;
    })
    .filter(
      (b) =>
        !s ||
        b.customer.name.toLowerCase().includes(s) ||
        b.customer.phone.includes(s) ||
        b.ref.toLowerCase().replace("-", "").includes(s.replace("-", "")),
    )
    .sort((a, b) => {
      const k = (x: Booking) => x.date + String(x.start).padStart(2, "0");
      return filter === "upcoming" || filter === "unpaid" ? k(a).localeCompare(k(b)) : k(b).localeCompare(k(a));
    });

  return (
    <>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search name, number or booking ID"
        placeholderTextColor={c.textMuted}
        style={styles.search}
        autoCorrect={false}
        accessibilityLabel="Search bookings"
      />
      <Pills label="Show" options={FILTERS} value={filter} onChange={setFilter} />
      {shown.length === 0 ? (
        <Empty title={search ? "No match" : filter === "unpaid" ? "Nothing to collect" : "No bookings here"} />
      ) : (
        <View style={styles.group}>
          {shown.slice(0, 200).map((b) => {
            const court = venue.courts.find((c) => c.id === b.courtId);
            return (
              <Pressable
                key={b.ref}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/manage/booking/[ref]", params: { ref: b.ref } })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.subtle }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[text.label, { color: c.textMuted }]}>{formatWhen(b.date, b.start, b.hours)}</Text>
                  <Text style={[text.subhead, { color: c.text }, b.status === "cancelled" && styles.struck]}>{b.customer.name}</Text>
                  <Text style={[text.body, { color: c.textMuted, fontSize: 14, lineHeight: 20 }]}>
                    {court?.name} · {formatRupees(b.price)} · {b.customer.phone}
                  </Text>
                </View>
                {b.status === "cancelled" ? (
                  <Tag label="Cancelled" tone="line" />
                ) : b.status === "pending_payment" ? (
                  <Tag label="Paying" tone="line" />
                ) : !b.paid ? (
                  <Tag label="Collect" tone="floodlight" />
                ) : null}
                <ChevronIcon color={c.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );
}

export default function OwnerBookings() {
  return (
    <Screen title="Bookings">
      <OwnerGate>{(v) => <List v={v} />}</OwnerGate>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  search: {
    borderWidth: 2,
    borderColor: c.strong,
    borderRadius: radius.control,
    backgroundColor: c.surface,
    paddingHorizontal: space.md,
    minHeight: 48,
    fontFamily: fonts.text400,
    fontSize: 16,
    color: c.text,
  },
  group: { backgroundColor: c.surface, borderRadius: radius.card, borderWidth: 2, borderColor: c.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderBottomWidth: 1, borderBottomColor: c.border },
  struck: { textDecorationLine: "line-through", color: c.textMuted },
});
