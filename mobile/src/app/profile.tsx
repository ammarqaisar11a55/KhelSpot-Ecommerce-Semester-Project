import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError, auth } from "@/api/client";
import { updateUser, useSession } from "@/auth/session";
import { ErrorState } from "@/components/kit";
import { haptic } from "@/components/motion";
import { Button, Label } from "@/components/ui";
import { fonts, radius, space, text, useStyles, type Palette } from "@/theme";

/** Signed-in profile: the name venues see on your bookings. */
export default function Profile() {
  const styles = useStyles(makeStyles);
  const { user } = useSession();
  const [name, setName] = useState(user?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);

  if (!user) {
    return (
      <View style={styles.body}>
        <ErrorState error={new ApiError("UNAUTHENTICATED", "Sign in first to edit your profile.")} />
      </View>
    );
  }

  const save = async () => {
    if (!name.trim()) return setFailure(new ApiError("NAME", "Add the name venues should see."));
    setBusy(true);
    setFailure(null);
    try {
      updateUser(await auth.setName(name.trim()));
      haptic.success();
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (e) {
      haptic.error();
      setFailure(e instanceof ApiError ? e : new ApiError("UNKNOWN", "Couldn't save. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 6 }}>
        <Label>Mobile number</Label>
        <Text style={[text.bodyStrong, styles.ink]}>{user.phone}</Text>
      </View>
      <View style={{ gap: 6 }}>
        <Label>Name</Label>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          autoComplete="name"
          textContentType="name"
          placeholder="Ali Raza"
          accessibilityLabel="Name"
          onSubmitEditing={save}
        />
        <Text style={[text.body, styles.slate, { fontSize: 14, lineHeight: 20 }]}>Venues see this name on your bookings.</Text>
      </View>
      {failure ? <ErrorState error={failure} /> : null}
      <Button label="Save" busy={busy} onPress={save} />
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    body: { padding: space.xl, gap: space.xl, backgroundColor: c.bg, flexGrow: 1 },
    ink: { color: c.text },
    slate: { color: c.textMuted },
    input: {
      borderWidth: 2,
      borderColor: c.strong,
      borderRadius: radius.control,
      backgroundColor: c.surface,
      paddingHorizontal: space.md,
      minHeight: 52,
      fontFamily: fonts.text400,
      fontSize: 16,
      color: c.text,
    },
  });
