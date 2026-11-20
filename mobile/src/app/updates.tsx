import * as WebBrowser from "expo-web-browser";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowDownIcon } from "@/components/icons";
import { Button, Card, Label, Tag } from "@/components/ui";
import { colors, radius, space, text } from "@/theme";
import { canSelfUpdate, installed, updaterConfig } from "@/updater/config";
import type { Channel } from "@/updater/github";
import { useUpdater } from "@/updater/UpdaterProvider";

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function when(d: Date) {
  return d.toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Label>{label}</Label>
      <Text style={[text.bodyStrong, styles.ink]}>{value}</Text>
    </View>
  );
}

function ChannelPicker({ value, onChange, disabled }: { value: Channel; onChange: (c: Channel) => void; disabled: boolean }) {
  const options: { id: Channel; label: string; hint: string }[] = [
    { id: "stable", label: "Stable", hint: "Tagged releases" },
    { id: "beta", label: "Beta", hint: "Every push to main" },
  ];
  return (
    <View style={styles.pills} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled }}
            disabled={disabled}
            onPress={() => onChange(o.id)}
            style={[styles.pill, on && styles.pillOn]}
          >
            <Text style={[text.bodyStrong, { color: colors.ink }]}>{o.label}</Text>
            <Text style={[text.body, { color: on ? colors.ink : colors.slate, fontSize: 13, lineHeight: 18 }]}>{o.hint}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function UpdatesScreen() {
  const u = useUpdater();

  if (!canSelfUpdate) {
    return (
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <Label>Installed</Label>
          <Text style={[text.subhead, styles.ink]}>
            v{installed.versionName} · {updaterConfig.commit}
          </Text>
          <Text style={[text.body, styles.slate]}>
            {Platform.OS === "ios"
              ? "On iPhone, new builds come from TestFlight."
              : Platform.OS === "web"
                ? "The updater runs in the Android app. Open the latest build's page on GitHub to install it."
                : "This build updates through the app store, or this is a development build."}
          </Text>
        </Card>
        <Button
          kind="outline"
          label="Builds on GitHub"
          onPress={() => WebBrowser.openBrowserAsync(`https://github.com/${updaterConfig.repo}/releases`)}
        />
      </ScrollView>
    );
  }

  const busy = u.status === "checking" || u.status === "downloading";
  const m = u.build?.manifest;
  const newer = u.status === "available" || u.status === "downloading" || u.status === "ready";

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.facts}>
        <Fact label="Installed" value={`v${installed.versionName} · build ${installed.versionCode}`} />
        <Fact label="Commit" value={updaterConfig.commit} />
        <Fact label="Last checked" value={u.lastChecked ? when(u.lastChecked) : "Not yet"} />
      </View>

      <View style={{ gap: space.sm }}>
        <Label>Channel</Label>
        <ChannelPicker value={u.channel} onChange={u.setChannel} disabled={busy} />
      </View>

      {newer && m && u.build ? (
        <Card style={u.required ? { borderColor: colors.tape } : { borderColor: colors.ink }}>
          <View style={styles.tags}>
            <Tag label={u.required ? "Required" : "New build"} tone={u.required ? "tape" : "floodlight"} />
            <Tag label={m.channel === "stable" ? "Stable" : "Beta"} tone="line" />
          </View>
          <Text style={[text.heading, styles.ink]}>
            v{m.versionName} · Build {m.versionCode}
          </Text>
          <Text style={[text.body, styles.slate]}>
            {mb(u.build.apkSize)} · {when(new Date(m.publishedAt))} · {m.commit.slice(0, 7)}
          </Text>
          {m.notes.length ? (
            <View style={styles.notes}>
              {m.notes.slice(0, 8).map((n, i) => (
                <Text key={i} style={[text.body, styles.ink]}>
                  –  {n}
                </Text>
              ))}
            </View>
          ) : null}

          {u.status === "downloading" ? (
            <View style={{ gap: space.sm }}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(u.progress * 100)}%` }]} />
              </View>
              <Text style={[text.label, styles.slate]}>Downloading · {Math.round(u.progress * 100)}%</Text>
              <Button kind="outline" label="Cancel" onPress={u.cancel} />
            </View>
          ) : u.status === "ready" ? (
            <Button label="Install" onPress={u.install} />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={u.download}
              style={({ pressed }) => [styles.download, pressed && { opacity: 0.85 }]}
            >
              <ArrowDownIcon color={colors.chalk} />
              <Text style={[text.bodyStrong, { color: colors.chalk, fontFamily: text.subhead.fontFamily }]}>
                Download and install
              </Text>
            </Pressable>
          )}
        </Card>
      ) : null}

      {u.status === "up-to-date" ? (
        <Card>
          <Tag label="Up to date" tone="turf" />
          <Text style={[text.body, styles.ink]}>
            {!m
              ? `Nothing has been published on ${u.channel === "stable" ? "Stable" : "Beta"} yet.`
              : m.versionCode < installed.versionCode
                ? `You have a newer build than the latest ${u.channel} release (build ${m.versionCode}).`
                : `Build ${installed.versionCode} is the latest on ${u.channel === "stable" ? "Stable" : "Beta"}.`}
          </Text>
        </Card>
      ) : null}

      {u.error ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <Text style={[text.bodyStrong, styles.ink]}>{u.error}</Text>
        </View>
      ) : null}

      <Button kind="outline" label="Check for updates" busy={u.status === "checking"} disabled={busy} onPress={u.check} />

      <View style={{ gap: space.sm }}>
        <Text style={[text.body, styles.slate, { fontSize: 14, lineHeight: 21 }]}>
          The first install asks you to allow installs from KhelSpot. If you said no, allow it here, then tap Install
          again.
        </Text>
        <Pressable accessibilityRole="button" onPress={u.openInstallSettings} hitSlop={8}>
          <Text style={[text.bodyStrong, { color: colors.turf, textDecorationLine: "underline" }]}>
            Install unknown apps settings
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.xl, backgroundColor: colors.chalk, flexGrow: 1 },
  ink: { color: colors.ink },
  slate: { color: colors.slate },
  facts: { gap: space.md },
  fact: { gap: 2, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: space.md },
  pills: { flexDirection: "row", gap: space.sm },
  pill: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: colors.white,
  },
  pillOn: { borderColor: colors.ink, backgroundColor: colors.sand },
  tags: { flexDirection: "row", gap: space.sm },
  notes: { gap: space.xs, paddingVertical: space.xs },
  track: { height: 8, backgroundColor: colors.sand, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: 8, backgroundColor: colors.turf },
  download: {
    minHeight: 52,
    flexDirection: "row",
    gap: space.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.turf,
    borderRadius: radius.control,
    marginTop: space.sm,
  },
  error: { backgroundColor: colors.white, borderLeftWidth: 4, borderLeftColor: colors.tape, padding: space.md },
});
