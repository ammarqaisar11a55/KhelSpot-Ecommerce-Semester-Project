import { Pressable, StyleSheet, Text, View } from "react-native";
import { describePolicy, formatRupees } from "@shared/domain/pricing";
import { formatHour } from "@shared/domain/time";
import { SPORT_LABEL, type Sport } from "@shared/domain/types";
import { api } from "@/api/client";
import { useQuery } from "@/api/useQuery";
import { ErrorState, Loading, VenuePhoto } from "@/components/kit";
import { Card, Label, Screen } from "@/components/ui";
import { setOwnerVenue, useOwnerVenue } from "@/owner/store";
import { VenuePicker } from "@/owner/VenuePicker";
import { colors, space, text } from "@/theme";

/** The listing players see. Editing hours and rates arrives with owner sign-in. */
export default function OwnerVenue() {
  const slug = useOwnerVenue();
  const venue = useQuery(slug ? `venue|${slug}` : null, () => api.venue(slug!));

  if (!slug) {
    return (
      <Screen title="Venue">
        <VenuePicker />
      </Screen>
    );
  }
  const v = venue.data;
  return (
    <Screen title="Venue" kicker={v?.name} refreshing={venue.refreshing} onRefresh={venue.refresh}>
      {venue.error ? (
        <ErrorState error={venue.error} onRetry={venue.refresh} />
      ) : !v ? (
        <Loading label="Loading venue" />
      ) : (
        <>
          <View style={{ borderRadius: 8, overflow: "hidden" }}>
            <VenuePhoto src={v.photo?.src} alt={v.photo?.alt} height={170} area={v.area} />
          </View>
          <Card>
            <Label>Address</Label>
            <Text style={[text.body, styles.ink]}>{v.address}</Text>
            <Label>Open</Label>
            <Text style={[text.bodyStrong, styles.ink]}>
              {formatHour(v.openHour)} – {formatHour(v.closeHour)}
            </Text>
            <Label>Courts</Label>
            <Text style={[text.body, styles.ink]}>{v.courts.map((c) => `${c.name} (${SPORT_LABEL[c.sport]})`).join(", ")}</Text>
          </Card>
          <Card>
            <Label>Rates per hour</Label>
            {(Object.keys(v.pricing) as Sport[]).map((sport) => (
              <View key={sport} style={{ gap: 2, marginBottom: space.xs }}>
                <Text style={[text.bodyStrong, styles.ink]}>{SPORT_LABEL[sport]}</Text>
                {v.pricing[sport]!.map((b) => (
                  <Text key={`${b.from}`} style={[text.body, styles.slate, { fontSize: 14, lineHeight: 20 }]}>
                    {b.label}: {formatHour(b.from)} – {formatHour(b.to)} · {formatRupees(b.price)}
                  </Text>
                ))}
              </View>
            ))}
          </Card>
          <Card>
            <Label>Cancellation</Label>
            <Text style={[text.body, styles.ink]}>{describePolicy(v.cancellation)}</Text>
            <Label>Pay at venue</Label>
            <Text style={[text.body, styles.ink]}>{v.payAtVenue ? "Allowed" : "Online payment only"}</Text>
          </Card>
          <Text style={[text.body, styles.slate, { fontSize: 14, lineHeight: 20 }]}>
            Editing hours, rates and the photo arrives with owner sign-in. Until then, change them on the web dashboard.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setOwnerVenue(null)} hitSlop={8}>
            <Text style={[text.bodyStrong, { color: colors.turf, textDecorationLine: "underline" }]}>Change venue</Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ink: { color: colors.ink },
  slate: { color: colors.slate },
});
