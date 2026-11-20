import { Pressable, StyleSheet, Text, View } from "react-native";
import { SPORT_LABEL } from "@shared/domain/types";
import { api } from "@/api/client";
import { useQuery } from "@/api/useQuery";
import { ChevronIcon } from "@/components/icons";
import { ErrorState, Loading } from "@/components/kit";
import { Label } from "@/components/ui";
import { colors, radius, space, text } from "@/theme";
import { setOwnerVenue } from "./store";

/** "Which venue do you run?" Shown until the owner picks one (sign-in will set it later). */
export function VenuePicker() {
  const venues = useQuery("venues", () => api.venues());
  if (venues.error) return <ErrorState error={venues.error} onRetry={venues.refresh} />;
  if (!venues.data) return <Loading label="Loading venues" />;
  return (
    <View style={{ gap: space.sm }}>
      <Label>Which venue do you run?</Label>
      <View style={styles.group}>
        {venues.data.map((v) => (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            onPress={() => setOwnerVenue(v.slug)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.sand }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[text.subhead, { color: colors.ink }]}>{v.name}</Text>
              <Text style={[text.body, { color: colors.slate, fontSize: 14, lineHeight: 20 }]}>
                {v.area} · {v.courts.length} courts · {[...new Set(v.courts.map((c) => SPORT_LABEL[c.sport]))].join(", ")}
              </Text>
            </View>
            <ChevronIcon color={colors.slate} />
          </Pressable>
        ))}
      </View>
      <Text style={[text.body, { color: colors.slate, fontSize: 14, lineHeight: 20 }]}>
        Until owner sign-in arrives, the app shows your venue&apos;s booked and open hours, the same as players see. Names,
        numbers and payments stay on the web dashboard for now.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 2, borderColor: colors.line, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
});
