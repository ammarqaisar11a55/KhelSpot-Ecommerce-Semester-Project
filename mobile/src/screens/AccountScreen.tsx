import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LogoMark } from "@/components/brand";
import { ChevronIcon } from "@/components/icons";
import { Screen, Tag } from "@/components/ui";
import { useConnection } from "@/api/connection";
import { homeFor, useRole, type Role } from "@/role/RoleProvider";
import { colors, radius, space, text } from "@/theme";
import { canSelfUpdate, installed, updaterConfig } from "@/updater/config";
import { useUpdater } from "@/updater/UpdaterProvider";

function Row({ title, detail, right, onPress }: { title: string; detail?: string; right?: ReactNode; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.sand }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[text.bodyStrong, styles.ink]}>{title}</Text>
        {detail ? <Text style={[text.body, styles.slate, styles.small]}>{detail}</Text> : null}
      </View>
      {right}
      {onPress ? <ChevronIcon color={colors.slate} /> : null}
    </Pressable>
  );
}

/** Account tab for both sides of the app. */
export function AccountScreen({ role }: { role: Role }) {
  const { status } = useUpdater();
  const { setRole } = useRole();
  const conn = useConnection();
  const hasUpdate = status === "available" || status === "ready" || status === "downloading";
  const other: Role = role === "owner" ? "player" : "owner";

  const switchRole = () => {
    setRole(other);
    router.replace(homeFor(other));
  };

  return (
    <Screen title="Account">
      <View style={styles.group}>
        <Row
          title="App updates"
          detail={
            canSelfUpdate
              ? `v${installed.versionName} · build ${installed.versionCode} · ${updaterConfig.commit}`
              : "Updates come from the app store on this device"
          }
          right={hasUpdate ? <Tag label="New" tone="floodlight" /> : null}
          onPress={() => router.push("/updates")}
        />
        <Row
          title="Server connection"
          detail={conn.apiUrl ?? "Not set"}
          onPress={() => router.push("/connection")}
        />
        <Row
          title={role === "owner" ? "Book a court instead" : "I run a venue"}
          detail={role === "owner" ? "Switch to the player side of the app" : "Switch to the venue owner side of the app"}
          onPress={switchRole}
        />
      </View>

      <View style={styles.about}>
        <LogoMark size={40} />
        <View style={{ flex: 1 }}>
          <Text style={[text.bodyStrong, styles.ink]}>KhelSpot for Android</Text>
          <Text style={[text.body, styles.slate, styles.small]}>
            Indoor courts in Lahore. Players book and pay; venues see every booking in one place.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ink: { color: colors.ink },
  slate: { color: colors.slate },
  small: { fontSize: 14, lineHeight: 20 },
  group: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.line,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  about: { flexDirection: "row", gap: space.md, alignItems: "center", paddingTop: space.sm },
});
