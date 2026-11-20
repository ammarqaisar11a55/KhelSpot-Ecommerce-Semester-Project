// More kit pieces: pill filters, loading / error / empty states, the venue photo.

import { Image } from "expo-image";
import type { ReactNode } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ApiError } from "@/api/client";
import { photoUrl, useConnection } from "@/api/connection";
import { router } from "expo-router";
import { PressableScale } from "./motion";
import { Button } from "./ui";
import { radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

/** Horizontal row of pill filters. The selected pill is Ink with Chalk text; Floodlight stays for open slots. */
export function Pills<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pills}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <PressableScale
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.id)}
            depth={0.94}
            style={[styles.pill, on && styles.pillOn]}
          >
            <Text style={[text.bodyStrong, { fontSize: 14, lineHeight: 18, color: on ? c.onStrong : c.text }]}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.center} accessibilityLabel={label}>
      <ActivityIndicator color={c.link} size="large" />
    </View>
  );
}

/** Error card. Points to Server connection when the server can't be reached. */
export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const unreachable = error.code === "OFFLINE" || error.code === "NOT_CONFIGURED";
  return (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <Text style={[text.subhead, { color: c.text }]}>
        {unreachable ? "Can't reach KhelSpot" : "That didn't work"}
      </Text>
      <Text style={[text.body, { color: c.textMuted }]}>{error.message}</Text>
      <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
        {onRetry ? <Button kind="outline" label="Try again" onPress={onRetry} style={{ minHeight: 44 }} /> : null}
        {unreachable ? (
          <Button kind="outline" label="Server connection" onPress={() => router.push("/connection")} style={{ minHeight: 44 }} />
        ) : null}
      </View>
    </View>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.empty}>
      <Text style={[text.subhead, { color: c.text }]}>{title}</Text>
      {children}
    </View>
  );
}

/** Venue photo, or a Turf block with the area name when there is none. */
export function VenuePhoto({ src, alt, height, area }: { src?: string; alt?: string; height: number; area?: string }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const conn = useConnection();
  const uri = photoUrl(src, conn);
  if (!uri) {
    return (
      <View style={[styles.noPhoto, { height }]}>
        {area ? <Text style={[text.label, { color: c.floodlight }]}>{area}</Text> : null}
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ height, width: "100%", backgroundColor: c.deepTurf }}
      contentFit="cover"
      transition={150}
      accessibilityLabel={alt}
    />
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  pills: { gap: space.sm, paddingVertical: 2 },
  pill: {
    borderWidth: 2,
    borderColor: c.strong,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: 8,
    backgroundColor: c.surface,
  },
  pillOn: { backgroundColor: c.strong },
  center: { paddingVertical: space.xxl, alignItems: "center" },
  error: {
    backgroundColor: c.surface,
    borderLeftWidth: 4,
    borderLeftColor: c.tape,
    borderRadius: radius.control,
    padding: space.lg,
    gap: space.sm,
  },
  empty: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: c.border,
    borderRadius: radius.card,
    padding: space.xl,
    gap: space.sm,
  },
  noPhoto: { width: "100%", backgroundColor: c.deepTurf, justifyContent: "flex-end", padding: space.md },
});
