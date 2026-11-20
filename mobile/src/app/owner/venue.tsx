import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { describePolicy } from "@shared/domain/pricing";
import { formatHour } from "@shared/domain/time";
import { SPORT_LABEL, type RateBand, type Sport, type Venue } from "@shared/domain/types";
import { ApiError, owner, type VenueSettingsInput } from "@/api/client";
import { invalidateQueries, useQuery } from "@/api/useQuery";
import { haptic } from "@/components/motion";
import { ErrorState, Loading, VenuePhoto } from "@/components/kit";
import { Button, Card, Label, Screen, Tag } from "@/components/ui";
import { OwnerGate } from "@/owner/OwnerGate";
import type { OwnedVenue } from "@/owner/store";
import { fonts, radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  format: (n: number) => string;
  label: string;
}) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const btn = (delta: number, glyph: string) => {
    const next = value + delta;
    const off = next < min || next > max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${delta > 0 ? "up" : "down"}`}
        disabled={off}
        onPress={() => onChange(next)}
        style={({ pressed }) => [styles.stepBtn, off && { opacity: 0.3 }, pressed && { backgroundColor: c.subtle }]}
      >
        <Text style={[text.subhead, { color: c.text }]}>{glyph}</Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.stepper} accessibilityLabel={`${label}: ${format(value)}`}>
      {btn(-step, "−")}
      <Text style={[text.bodyStrong, styles.stepValue]}>{format(value)}</Text>
      {btn(step, "+")}
    </View>
  );
}

const settingsOf = (v: Venue): VenueSettingsInput => ({
  openHour: v.openHour,
  closeHour: v.closeHour,
  pricing: JSON.parse(JSON.stringify(v.pricing)) as Venue["pricing"],
  cancellation: { ...v.cancellation },
  payAtVenue: v.payAtVenue,
});

function Editor({ venue, onSaved }: { venue: Venue; onSaved: (v: Venue) => void }) {
  const styles = useStyles(makeStyles);
  const [s, setS] = useState<VenueSettingsInput>(() => settingsOf(venue));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(settingsOf(venue));
  const sports = [...new Set(venue.courts.map((c) => c.sport))];

  const patch = (next: Partial<VenueSettingsInput>) => {
    setS((cur) => ({ ...cur, ...next }));
    setSaved(false);
  };
  const setBands = (sport: Sport, bands: RateBand[]) => patch({ pricing: { ...s.pricing, [sport]: bands } });

  const save = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const v = await owner.saveSettings(venue.id, s);
      onSaved(v);
      setSaved(true);
      invalidateQueries("venue");
      invalidateQueries("avail|");
      invalidateQueries("owner-");
      haptic.success();
    } catch (e) {
      setFailure(e instanceof ApiError ? e : new ApiError("UNKNOWN", "Couldn't save. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <Label>Opening hours</Label>
        <View style={styles.row}>
          <Text style={[text.body, styles.ink, { width: 56 }]}>Opens</Text>
          <Stepper label="Opens" value={s.openHour} min={6} max={s.closeHour - 1} onChange={(n) => patch({ openHour: n })} format={formatHour} />
        </View>
        <View style={styles.row}>
          <Text style={[text.body, styles.ink, { width: 56 }]}>Closes</Text>
          <Stepper
            label="Closes"
            value={s.closeHour}
            min={s.openHour + 1}
            max={30}
            onChange={(n) => patch({ closeHour: n })}
            format={(h) => `${formatHour(h)}${h > 24 ? " (next day)" : ""}`}
          />
        </View>
      </Card>

      {sports.map((sport) => {
        const bands = s.pricing[sport] ?? [];
        return (
          <Card key={sport}>
            <Label>{SPORT_LABEL[sport]} rates per hour</Label>
            {bands.map((b, i) => (
              <View key={i} style={styles.band}>
                <View style={[styles.row, { justifyContent: "space-between" }]}>
                  <TextInput
                    value={b.label}
                    onChangeText={(label) => setBands(sport, bands.map((x, j) => (j === i ? { ...x, label } : x)))}
                    style={[styles.input, { flex: 1 }]}
                    accessibilityLabel={`${SPORT_LABEL[sport]} band ${i + 1} name`}
                  />
                  <View style={styles.rs}>
                    <Text style={[text.bodyStrong, styles.slate]}>Rs</Text>
                    <TextInput
                      value={String(b.price)}
                      onChangeText={(t) => setBands(sport, bands.map((x, j) => (j === i ? { ...x, price: Number(t.replace(/\D/g, "")) || 0 } : x)))}
                      keyboardType="number-pad"
                      style={[styles.input, { width: 96, textAlign: "right" }]}
                      accessibilityLabel={`${SPORT_LABEL[sport]} band ${i + 1} price`}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <Stepper label="From" value={b.from} min={0} max={b.to - 1} onChange={(n) => setBands(sport, bands.map((x, j) => (j === i ? { ...x, from: n } : x)))} format={formatHour} />
                  <Text style={[text.body, styles.slate]}>to</Text>
                  <Stepper label="To" value={b.to} min={b.from + 1} max={30} onChange={(n) => setBands(sport, bands.map((x, j) => (j === i ? { ...x, to: n } : x)))} format={formatHour} />
                </View>
                {bands.length > 1 ? (
                  <Pressable accessibilityRole="button" onPress={() => setBands(sport, bands.filter((_, j) => j !== i))} hitSlop={6}>
                    <Text style={[text.bodyStrong, styles.link]}>Remove this rate</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {(bands.at(-1)?.to ?? s.openHour) < s.closeHour ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => {
                  const from = bands.at(-1)?.to ?? s.openHour;
                  setBands(sport, [...bands, { from, to: s.closeHour, price: bands.at(-1)?.price ?? 3000, label: "Peak" }]);
                }}
              >
                <Text style={[text.bodyStrong, styles.link]}>Add a rate from {formatHour(bands.at(-1)?.to ?? s.openHour)}</Text>
              </Pressable>
            ) : null}
          </Card>
        );
      })}

      <Card>
        <Label>Cancellation</Label>
        <View style={styles.row}>
          <Text style={[text.body, styles.ink, { flex: 1 }]}>Free until</Text>
          <Stepper
            label="Free cancellation hours"
            value={s.cancellation.freeUntilHours}
            min={0}
            max={72}
            onChange={(n) => patch({ cancellation: { ...s.cancellation, freeUntilHours: n } })}
            format={(n) => `${n} h before`}
          />
        </View>
        <View style={styles.row}>
          <Text style={[text.body, styles.ink, { flex: 1 }]}>After that</Text>
          <Stepper
            label="Late refund percent"
            value={s.cancellation.lateRefundPercent}
            min={0}
            max={100}
            step={10}
            onChange={(n) => patch({ cancellation: { ...s.cancellation, lateRefundPercent: n } })}
            format={(n) => `${n}% back`}
          />
        </View>
        <Text style={[text.body, styles.slate, { fontSize: 14, lineHeight: 20 }]}>Players see: {describePolicy(s.cancellation)}</Text>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: s.payAtVenue }} onPress={() => patch({ payAtVenue: !s.payAtVenue })} style={[styles.row, { minHeight: 44 }]}>
          <View style={[styles.track, s.payAtVenue && styles.trackOn]}>
            <View style={[styles.knob, s.payAtVenue && styles.knobOn]} />
          </View>
          <Text style={[text.bodyStrong, styles.ink, { flex: 1 }]}>Players can pay at the venue</Text>
        </Pressable>
      </Card>

      {failure ? <ErrorState error={failure} /> : null}
      {saved ? <Tag label="Saved. Players see the new rates now." tone="turf" /> : null}
      <Button label="Save changes" busy={busy} disabled={!dirty} onPress={save} />
    </>
  );
}

function VenueTab({ v }: { v: OwnedVenue }) {
  const styles = useStyles(makeStyles);
  const q = useQuery(`owner-venue|${v.venueId}`, () => owner.venue(v.venueId));
  const [current, setCurrent] = useState<Venue | null>(null);
  if (q.error) return <ErrorState error={q.error} onRetry={q.refresh} />;
  const venue = current ?? q.data;
  if (!venue) return <Loading label="Loading venue" />;
  return (
    <>
      <View style={{ borderRadius: radius.card, overflow: "hidden" }}>
        <VenuePhoto src={venue.photo?.src} alt={venue.photo?.alt} height={160} area={venue.area} />
      </View>
      <View style={{ gap: 2 }}>
        <Text style={[text.heading, styles.ink]}>{venue.name}</Text>
        <Text style={[text.body, styles.slate]}>{venue.address}</Text>
      </View>
      <Editor key={venue.id} venue={venue} onSaved={setCurrent} />
    </>
  );
}

export default function OwnerVenue() {
  return (
    <Screen title="Venue">
      <OwnerGate>{(v) => <VenueTab v={v} />}</OwnerGate>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  ink: { color: c.text },
  slate: { color: c.textMuted },
  link: { color: c.link, textDecorationLine: "underline" },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  band: { gap: space.sm, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: c.border },
  rs: { flexDirection: "row", alignItems: "center", gap: 6 },
  input: {
    borderWidth: 2,
    borderColor: c.border,
    borderRadius: radius.control,
    backgroundColor: c.surface,
    paddingHorizontal: space.sm,
    minHeight: 44,
    fontFamily: fonts.text600,
    fontSize: 15,
    color: c.text,
  },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 2, borderColor: c.strong, borderRadius: radius.control, overflow: "hidden" },
  stepBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  stepValue: { minWidth: 92, textAlign: "center", color: c.text, fontSize: 14 },
  track: { width: 48, height: 28, borderRadius: 14, backgroundColor: c.border, padding: 3 },
  trackOn: { backgroundColor: c.turf },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.surface },
  knobOn: { transform: [{ translateX: 20 }] },
});
