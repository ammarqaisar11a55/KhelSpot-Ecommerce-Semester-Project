import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronIcon } from "./icons";
import { radius, space, text, useStyles, usePalette, type Palette } from "@/theme";
import { useUpdater } from "@/updater/UpdaterProvider";

/** A small, non-blocking note when a newer build is on GitHub. Tape only when the update is required. */
export function UpdateBanner() {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const { status, build, required } = useUpdater();
  if (!build || (status !== "available" && status !== "ready" && status !== "downloading")) return null;
  const bg = required ? c.tape : c.floodlight;
  return (
    <Link href="/updates" asChild>
      <Pressable accessibilityRole="link" style={({ pressed }) => [styles.banner, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[text.label, styles.ink]}>{required ? "Update required" : "Update ready"}</Text>
          <Text style={[text.bodyStrong, styles.ink]}>
            Build {build.manifest.versionCode} · v{build.manifest.versionName}
          </Text>
        </View>
        <ChevronIcon color={c.ink} />
      </Pressable>
    </Link>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  ink: { color: c.ink },
});
