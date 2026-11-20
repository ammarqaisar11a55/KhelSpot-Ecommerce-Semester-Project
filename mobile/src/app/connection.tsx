import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getConnection, saveConnection, savedConnection, useConnection } from "@/api/connection";
import { Button, Card, Label, Tag } from "@/components/ui";
import { colors, fonts, radius, space, text } from "@/theme";

type Check = { state: "idle" | "checking" | "ok" | "fail"; message?: string };

const SOURCE = {
  saved: "Saved on this phone",
  build: "Set in this build",
  dev: "Development: the computer running Metro",
  none: "Not set",
} as const;

/** Points the app at a KhelSpot Server. Until the Server is deployed, use your laptop's Wi-Fi address. */
export default function ConnectionScreen() {
  const conn = useConnection();
  const saved = savedConnection();
  const [apiUrl, setApiUrl] = useState(saved.apiUrl ?? "");
  const [webUrl, setWebUrl] = useState(saved.webUrl ?? "");
  const [check, setCheck] = useState<Check>({ state: "idle" });

  const test = async () => {
    const base = getConnection().apiUrl;
    if (!base) return setCheck({ state: "fail", message: "No server address yet." });
    setCheck({ state: "checking" });
    try {
      const res = await fetch(`${base}/health`);
      const body = (await res.json()) as { ok?: boolean };
      setCheck(res.ok && body.ok ? { state: "ok", message: `Connected to ${base}` } : { state: "fail", message: `The server answered ${res.status}.` });
    } catch {
      setCheck({ state: "fail", message: `Can't reach ${base}. Same Wi-Fi as the laptop? Is the Server running?` });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Card>
        <Label>In use</Label>
        <Text style={[text.bodyStrong, styles.ink]}>{conn.apiUrl ?? "No server"}</Text>
        <Text style={[text.body, styles.slate, styles.small]}>{SOURCE[conn.source]}</Text>
        {conn.webUrl ? <Text style={[text.body, styles.slate, styles.small]}>Photos from {conn.webUrl}</Text> : null}
      </Card>

      <View style={{ gap: 6 }}>
        <Label color={colors.ink}>Server address</Label>
        <TextInput
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://192.168.1.20:4000"
          placeholderTextColor={colors.slate}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          accessibilityLabel="Server address"
        />
        <Label color={colors.ink}>Website address (photos)</Label>
        <TextInput
          value={webUrl}
          onChangeText={setWebUrl}
          placeholder="Leave empty: same computer, port 3000"
          placeholderTextColor={colors.slate}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
          accessibilityLabel="Website address"
        />
      </View>

      <View style={{ flexDirection: "row", gap: space.md }}>
        <Button
          label="Save"
          style={{ flex: 1 }}
          onPress={() => {
            saveConnection({ apiUrl, webUrl });
            setCheck({ state: "idle" });
          }}
        />
        <Button kind="outline" label="Test" style={{ flex: 1 }} busy={check.state === "checking"} onPress={test} />
      </View>
      {check.state === "ok" || check.state === "fail" ? (
        <View style={{ gap: space.xs }}>
          <Tag label={check.state === "ok" ? "Connected" : "Not connected"} tone={check.state === "ok" ? "turf" : "tape"} />
          <Text style={[text.body, styles.ink]}>{check.message}</Text>
        </View>
      ) : null}

      <Text style={[text.body, styles.slate, styles.small]}>
        Testing on your phone before the Server is online: run the Server and the website on your laptop, connect the phone to
        the same Wi-Fi, and enter the laptop&apos;s address with port 4000 (find it with `hostname -I`). Clear the field and save
        to go back to this build&apos;s default.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.xl, backgroundColor: colors.chalk, flexGrow: 1 },
  ink: { color: colors.ink },
  slate: { color: colors.slate },
  small: { fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: radius.control,
    backgroundColor: colors.white,
    paddingHorizontal: space.md,
    minHeight: 52,
    fontFamily: fonts.text400,
    fontSize: 16,
    color: colors.ink,
    marginBottom: space.sm,
  },
});
