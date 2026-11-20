import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LogoMark } from "@/components/brand";
import { ChevronIcon } from "@/components/icons";
import { Pills } from "@/components/kit";
import { Screen, Tag } from "@/components/ui";
import { auth } from "@/api/client";
import { useConnection } from "@/api/connection";
import { signedOut, useSession } from "@/auth/session";
import { homeFor, useRole, type Role } from "@/role/RoleProvider";
import { radius, space, text, useStyles, usePalette, type Palette, setThemePreference, useThemePreference } from "@/theme";
import { canSelfUpdate, installed, updaterConfig } from "@/updater/config";
import { useUpdater } from "@/updater/UpdaterProvider";

function Row({ title, detail, right, onPress }: { title: string; detail?: string; right?: ReactNode; onPress?: () => void }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.subtle }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[text.bodyStrong, styles.ink]}>{title}</Text>
        {detail ? <Text style={[text.body, styles.slate, styles.small]}>{detail}</Text> : null}
      </View>
      {right}
      {onPress ? <ChevronIcon color={c.textMuted} /> : null}
    </Pressable>
  );
}

/** Account tab for both sides of the app. */
export function AccountScreen({ role }: { role: Role }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const { status } = useUpdater();
  const { setRole } = useRole();
  const conn = useConnection();
  const themePref = useThemePreference();
  const { user } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    await auth.logout().catch(() => {}); // the session is dropped on this phone either way
    signedOut();
    setSigningOut(false);
  };
  const hasUpdate = status === "available" || status === "ready" || status === "downloading";
  const other: Role = role === "owner" ? "player" : "owner";

  const switchRole = () => {
    setRole(other);
    router.replace(homeFor(other));
  };

  return (
    <Screen title="Account">
      <View style={styles.group}>
        {user ? (
          <Row
            title={user.name ?? user.phone}
            detail={`Signed in as ${user.phone}${user.ownerOf.length ? ` · manages ${user.ownerOf.map((v) => v.name).join(", ")}` : ""}`}
            right={<Text style={[text.bodyStrong, { color: c.link }]}>{signingOut ? "Signing out…" : "Sign out"}</Text>}
            onPress={signOut}
          />
        ) : (
          <Row
            title="Sign in"
            detail={role === "owner" ? "With your venue's mobile number" : "Your bookings on any phone"}
            onPress={() => router.push({ pathname: "/sign-in", params: role === "owner" ? { role: "owner" } : {} })}
          />
        )}
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

      <View style={{ gap: space.sm }}>
        <Text style={[text.subhead, { color: c.text }]}>Appearance</Text>
        <Pills
          label="Appearance"
          options={[
            { id: "system", label: "Same as phone" },
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
          ]}
          value={themePref}
          onChange={setThemePreference}
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  ink: { color: c.text },
  slate: { color: c.textMuted },
  small: { fontSize: 14, lineHeight: 20 },
  group: {
    backgroundColor: c.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: c.border,
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
    borderBottomColor: c.border,
  },
  about: { flexDirection: "row", gap: space.md, alignItems: "center", paddingTop: space.sm },
});
