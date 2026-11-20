// More kit pieces: pill filters, loading / error / empty states, the venue photo.

import { Image } from "expo-image";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ApiError } from "@/api/client";
import { photoUrl, useConnection } from "@/api/connection";
import { router } from "expo-router";
import { Button } from "./ui";
import { colors, radius, space, text } from "@/theme";

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
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.id)}
            style={[styles.pill, on && styles.pillOn]}
          >
            <Text style={[text.bodyStrong, { fontSize: 14, lineHeight: 18, color: on ? colors.chalk : colors.ink }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label}>
      <ActivityIndicator color={colors.turf} size="large" />
    </View>
  );
}

/** Error card. Points to Server connection when the server can't be reached. */
export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const unreachable = error.code === "OFFLINE" || error.code === "NOT_CONFIGURED";
  return (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <Text style={[text.subhead, { color: colors.ink }]}>
        {unreachable ? "Can't reach KhelSpot" : "That didn't work"}
      </Text>
      <Text style={[text.body, { color: colors.slate }]}>{error.message}</Text>
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
  return (
    <View style={styles.empty}>
      <Text style={[text.subhead, { color: colors.ink }]}>{title}</Text>
      {children}
    </View>
  );
}

/** Venue photo, or a Turf block with the area name when there is none. */
export function VenuePhoto({ src, alt, height, area }: { src?: string; alt?: string; height: number; area?: string }) {
  const conn = useConnection();
  const uri = photoUrl(src, conn);
  if (!uri) {
    return (
      <View style={[styles.noPhoto, { height }]}>
        {area ? <Text style={[text.label, { color: colors.floodlight }]}>{area}</Text> : null}
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ height, width: "100%", backgroundColor: colors.deepTurf }}
      contentFit="cover"
      transition={150}
      accessibilityLabel={alt}
    />
  );
}

const styles = StyleSheet.create({
  pills: { gap: space.sm, paddingVertical: 2 },
  pill: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: 8,
    backgroundColor: colors.white,
  },
  pillOn: { backgroundColor: colors.ink },
  center: { paddingVertical: space.xxl, alignItems: "center" },
  error: {
    backgroundColor: colors.white,
    borderLeftWidth: 4,
    borderLeftColor: colors.tape,
    borderRadius: radius.control,
    padding: space.lg,
    gap: space.sm,
  },
  empty: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: space.xl,
    gap: space.sm,
  },
  noPhoto: { width: "100%", backgroundColor: colors.deepTurf, justifyContent: "flex-end", padding: space.md },
});
