import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/auth/session";
import { Button, Card, Label } from "@/components/ui";
import { space, text, useStyles, usePalette, type Palette } from "@/theme";
import { chooseOwnerVenue, useOwnerVenue, type OwnedVenue } from "./store";

/** Renders owner screens only for a signed-in owner; otherwise asks them to sign in. */
export function OwnerGate({ children }: { children: (venue: OwnedVenue) => ReactNode }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const { user } = useSession();
  const venue = useOwnerVenue();
  if (venue) {
    const others = (user?.ownerOf ?? []).filter((v) => v.venueId !== venue.venueId);
    return (
      <>
        {children(venue)}
        {others.length ? (
          <View style={{ gap: space.xs }}>
            <Label>Your other venues</Label>
            {others.map((v) => (
              <Pressable key={v.venueId} accessibilityRole="button" onPress={() => chooseOwnerVenue(v.venueId)} hitSlop={6}>
                <Text style={[text.bodyStrong, styles.link]}>Switch to {v.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </>
    );
  }
  return (
    <Card>
      <Label>Venue owners</Label>
      <Text style={[text.subhead, { color: c.text }]}>
        {user ? `${user.phone} isn't linked to a venue` : "Sign in to your venue"}
      </Text>
      <Text style={[text.body, { color: c.textMuted }]}>
        {user
          ? "Venue accounts are set up by KhelSpot with the number the venue gave us. Sign in with that number, or contact KhelSpot to add this one."
          : "Use the mobile number on your venue account. You'll see every booking with names and numbers, take walk-ins, mark cash as paid and change your rates."}
      </Text>
      <Button label={user ? "Sign in with another number" : "Sign in"} onPress={() => router.push({ pathname: "/sign-in", params: { role: "owner" } })} />
    </Card>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  link: { color: c.link, textDecorationLine: "underline" },
});
