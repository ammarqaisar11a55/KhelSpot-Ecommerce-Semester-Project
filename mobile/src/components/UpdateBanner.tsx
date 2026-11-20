import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronIcon } from "./icons";
import { colors, radius, space, text } from "@/theme";
import { useUpdater } from "@/updater/UpdaterProvider";

/** A small, non-blocking note when a newer build is on GitHub. Tape only when the update is required. */
export function UpdateBanner() {
  const { status, build, required } = useUpdater();
  if (!build || (status !== "available" && status !== "ready" && status !== "downloading")) return null;
  const bg = required ? colors.tape : colors.floodlight;
  return (
    <Link href="/updates" asChild>
      <Pressable accessibilityRole="link" style={({ pressed }) => [styles.banner, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[text.label, styles.ink]}>{required ? "Update required" : "Update ready"}</Text>
          <Text style={[text.bodyStrong, styles.ink]}>
            Build {build.manifest.versionCode} · v{build.manifest.versionName}
          </Text>
        </View>
        <ChevronIcon color={colors.ink} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  ink: { color: colors.ink },
});
