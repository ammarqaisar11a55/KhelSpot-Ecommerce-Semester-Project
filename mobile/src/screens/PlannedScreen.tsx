import { StyleSheet, Text, View } from "react-native";
import { Card, Label, Screen } from "@/components/ui";
import { space, text, useStyles, type Palette } from "@/theme";

/**
 * Phase 0 placeholder for a screen whose data comes from the Server API.
 * States plainly what the screen will do and that it arrives through App updates.
 */
export function PlannedScreen({
  title,
  kicker,
  heading,
  body,
  points,
}: {
  title: string;
  kicker?: string;
  heading: string;
  body: string;
  points?: string[];
}) {
  const styles = useStyles(makeStyles);
  return (
    <Screen title={title} kicker={kicker}>
      <Card>
        <Label>Coming in the next build</Label>
        <Text style={[text.subhead, styles.ink]}>{heading}</Text>
        <Text style={[text.body, styles.slate]}>{body}</Text>
      </Card>
      {points?.length ? (
        <View style={{ gap: space.sm }}>
          {points.map((p) => (
            <View key={p} style={styles.point}>
              <Text style={[text.heading, styles.ink, { fontSize: 22, lineHeight: 24 }]}>{p}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  ink: { color: c.text },
  slate: { color: c.textMuted },
  point: { borderTopWidth: 2, borderTopColor: c.strong, paddingTop: space.sm, paddingBottom: space.xs },
});
