import { router, useLocalSearchParams } from "expo-router";
import { useState, type ComponentProps } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatRupees, priceFor, refundLine } from "@shared/domain/pricing";
import { formatWhen } from "@shared/domain/time";
import { PAYMENT_LABEL, PAYMENT_METHODS, type PaymentMethod } from "@shared/domain/types";
import { ApiError, api } from "@/api/client";
import { useQuery } from "@/api/useQuery";
import { ErrorState, Loading } from "@/components/kit";
import { Button, Label } from "@/components/ui";
import { rememberBooking, usePlayer } from "@/player/store";
import { colors, fonts, radius, space, text } from "@/theme";

/** Same rule as the Server: "+92 300-1234567" and "0300 1234567" become "03001234567". */
function normalisePhone(raw: string) {
  const compact = raw.replace(/[\s-]/g, "");
  return compact.startsWith("+92") ? `0${compact.slice(3)}` : compact;
}

function Field({
  label,
  value,
  onChange,
  error,
  ...input
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
} & Pick<ComponentProps<typeof TextInput>, "keyboardType" | "autoComplete" | "placeholder" | "textContentType">) {
  return (
    <View style={{ gap: 6 }}>
      <Label color={colors.ink}>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[styles.input, error && { borderColor: colors.tape }]}
        placeholderTextColor={colors.slate}
        accessibilityLabel={label}
        {...input}
      />
      {error ? <Text style={[text.body, { color: colors.ink, fontSize: 14 }]}>{error}</Text> : null}
    </View>
  );
}

export default function Checkout() {
  const p = useLocalSearchParams<{ slug: string; courtId: string; date: string; start: string; hours: string }>();
  const start = Number(p.start);
  const hours = Number(p.hours);
  const player = usePlayer();
  const venue = useQuery(`venue|${p.slug}`, () => api.venue(p.slug));

  const [name, setName] = useState(player.profile?.name ?? "");
  const [phone, setPhone] = useState(player.profile?.phone ?? "");
  const [payment, setPayment] = useState<PaymentMethod>("jazzcash");
  const [whatsapp, setWhatsapp] = useState(player.whatsappOk);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);

  if (venue.error) return <View style={styles.pad}><ErrorState error={venue.error} onRetry={venue.refresh} /></View>;
  const v = venue.data;
  if (!v) return <Loading label="Loading checkout" />;
  const court = v.courts.find((c) => c.id === p.courtId);
  if (!court) return <View style={styles.pad}><ErrorState error={new ApiError("NOT_FOUND", "That court isn't listed any more.")} /></View>;
  const price = priceFor(v.pricing[court.sport], start, hours);
  const methods = PAYMENT_METHODS.filter((m) => m !== "cash" || v.payAtVenue);

  const submit = async () => {
    const cleanPhone = normalisePhone(phone);
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Add the name the venue should expect.";
    if (!/^03\d{9}$/.test(cleanPhone)) e.phone = "Use a Pakistani mobile number, like 0300 1234567.";
    setErrors(e);
    if (e.name || e.phone) return;
    setBusy(true);
    setFailure(null);
    try {
      const customer = { name: name.trim(), phone: cleanPhone };
      const booking = await api.book({ venueId: v.id, courtId: court.id, date: p.date, start, hours, customer, payment });
      rememberBooking({ ref: booking.ref, phone: cleanPhone, venueSlug: v.slug, addedAt: new Date().toISOString() }, customer, whatsapp);
      // Back from the confirmation goes to the tabs, not to a checkout that is already done.
      if (router.canDismiss()) router.dismissAll();
      router.push({ pathname: "/booked/[ref]", params: { ref: booking.ref, fresh: "1" } });
    } catch (err) {
      setFailure(err instanceof ApiError ? err : new ApiError("UNKNOWN", "Booking didn't go through. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const payLabel = price === null ? "Book" : payment === "cash" ? `Book · pay ${formatRupees(price)} there` : `Pay ${formatRupees(price)} & book`;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.chalk }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.pad, { gap: space.xl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.summary}>
          <Label color={colors.floodlight}>{v.area}</Label>
          <Text style={[text.heading, { color: colors.chalk, fontSize: 26, lineHeight: 28 }]}>{v.name}</Text>
          <Text style={[text.bodyStrong, { color: colors.chalk }]}>
            {court.name} · {formatWhen(p.date, start, hours)}
          </Text>
          {price !== null ? (
            <Text style={[text.heading, { color: colors.floodlight, fontSize: 32, lineHeight: 34, textTransform: "none" }]}>{formatRupees(price)}</Text>
          ) : null}
        </View>

        <View style={{ gap: space.lg }}>
          <Field label="Name" value={name} onChange={setName} error={errors.name} autoComplete="name" textContentType="name" placeholder="Ali Raza" />
          <Field
            label="WhatsApp number"
            value={phone}
            onChange={setPhone}
            error={errors.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="0300 1234567"
          />
        </View>

        <View style={{ gap: space.sm }} accessibilityRole="radiogroup" accessibilityLabel="Payment">
          <Label color={colors.ink}>Payment</Label>
          {methods.map((m) => {
            const on = m === payment;
            return (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setPayment(m)}
                style={[styles.option, on && styles.optionOn]}
              >
                <View style={[styles.radio, on && styles.radioOn]} />
                <Text style={[text.bodyStrong, { color: colors.ink, flex: 1 }]}>{PAYMENT_LABEL[m]}</Text>
              </Pressable>
            );
          })}
          <Text style={[text.body, styles.slate, styles.small]}>
            Test build: no money is taken. JazzCash, Easypaisa and card checkout arrive with the payment providers.
          </Text>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: whatsapp }}
          onPress={() => setWhatsapp((w) => !w)}
          style={styles.consent}
        >
          <View style={[styles.box, whatsapp && styles.boxOn]}>{whatsapp ? <Text style={styles.tick}>✓</Text> : null}</View>
          <Text style={[text.body, { color: colors.ink, flex: 1, fontSize: 15, lineHeight: 22 }]}>
            Send my booking confirmation and reminders on WhatsApp. Reply STOP any time.
          </Text>
        </Pressable>

        <Text style={[text.body, styles.slate, styles.small]}>{refundLine(p.date, start, v.cancellation)}</Text>

        {failure ? <ErrorState error={failure} onRetry={failure.code === "SLOT_TAKEN" ? undefined : submit} /> : null}
        {failure?.code === "SLOT_TAKEN" ? <Button kind="outline" label="Pick another time" onPress={() => router.back()} /> : null}

        <Button label={payLabel} busy={busy} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: space.xl, paddingBottom: space.xxl * 2 },
  slate: { color: colors.slate },
  small: { fontSize: 14, lineHeight: 20 },
  summary: { backgroundColor: colors.ink, borderRadius: radius.card, padding: space.lg, gap: space.xs },
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
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.control,
    backgroundColor: colors.white,
    paddingHorizontal: space.md,
    minHeight: 52,
  },
  optionOn: { borderColor: colors.ink },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.slate },
  radioOn: { borderColor: colors.turf, borderWidth: 6 },
  consent: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  box: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.turf, borderColor: colors.turf },
  tick: { color: colors.chalk, fontFamily: fonts.text700, fontSize: 14, lineHeight: 16 },
});
