import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ApiError, auth } from "@/api/client";
import { signedIn } from "@/auth/session";
import { ErrorState } from "@/components/kit";
import { Button, Label } from "@/components/ui";
import { usePlayer } from "@/player/store";
import { fonts, radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

function normalisePhone(raw: string) {
  const compact = raw.replace(/[\s-]/g, "");
  return compact.startsWith("+92") ? `0${compact.slice(3)}` : compact;
}

/** Phone number, then the 6-digit code sent by SMS. Used by players and venue owners. */
export default function SignIn() {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const { role } = useLocalSearchParams<{ role?: "owner" | "player" }>();
  const player = usePlayer();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(player.profile?.phone ?? "");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [notOwner, setNotOwner] = useState(false);
  const clean = normalisePhone(phone);

  const send = async () => {
    if (!/^03\d{9}$/.test(clean)) {
      setError(new ApiError("PHONE", "Use a Pakistani mobile number, like 0300 1234567."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await auth.requestCode(clean);
      setDevCode(r.devCode ?? null);
      setStep("code");
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("UNKNOWN", "Couldn't send the code. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await auth.verify(clean, code.trim());
      if (role === "owner" && r.user.ownerOf.length === 0) {
        // Signed in fine, but this number manages no venue: keep the session, explain.
        signedIn(r.token, r.user);
        setNotOwner(true);
        return;
      }
      signedIn(r.token, r.user);
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("UNKNOWN", "Couldn't check the code. Try again."));
    } finally {
      setBusy(false);
    }
  };

  if (notOwner) {
    return (
      <View style={styles.body}>
        <Text style={[text.subhead, styles.ink]}>{clean} isn&apos;t linked to a venue</Text>
        <Text style={[text.body, styles.slate]}>
          Venue accounts are set up by KhelSpot with the number the venue gave us. If this is your venue&apos;s number,
          contact KhelSpot to add it. You&apos;re signed in as a player in the meantime.
        </Text>
        <Button kind="outline" label="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[text.heading, styles.ink]}>{role === "owner" ? "Sign in to your venue" : "Sign in"}</Text>
        <Text style={[text.body, styles.slate]}>
          {role === "owner"
            ? "Use the mobile number on your venue account. We'll text you a 6-digit code."
            : "Your bookings follow your number to any phone. We'll text you a 6-digit code."}
        </Text>

        {step === "phone" ? (
          <View style={{ gap: 6 }}>
            <Label color={c.text}>Mobile number</Label>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              placeholder="0300 1234567"
              placeholderTextColor={c.textMuted}
              style={styles.input}
              accessibilityLabel="Mobile number"
              onSubmitEditing={send}
            />
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            <Label color={c.text}>Code sent to {clean}</Label>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              placeholder="6 digits"
              placeholderTextColor={c.textMuted}
              style={[styles.input, styles.code]}
              accessibilityLabel="6-digit code"
              autoFocus
              onSubmitEditing={verify}
            />
            {devCode ? (
              <Text style={[text.body, styles.slate, { fontSize: 14 }]}>Local test server code: {devCode}</Text>
            ) : null}
          </View>
        )}

        {error ? <ErrorState error={error} /> : null}

        {step === "phone" ? (
          <Button label="Send code" busy={busy} onPress={send} />
        ) : (
          <>
            <Button label="Sign in" busy={busy} disabled={code.length !== 6} onPress={verify} />
            <Button
              kind="outline"
              label="Use another number"
              onPress={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  body: { padding: space.xl, gap: space.lg, backgroundColor: c.bg, flexGrow: 1 },
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
  code: { fontFamily: fonts.display800, fontSize: 28, letterSpacing: 8 },
});
