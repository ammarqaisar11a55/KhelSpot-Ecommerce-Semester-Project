import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState, type ComponentProps } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { formatRupees, priceFor, refundLine } from "@shared/domain/pricing";
import { formatWhen } from "@shared/domain/time";
import { PAYMENT_LABEL, PAYMENT_METHODS, type PaymentMethod } from "@shared/domain/types";
import { ApiError, api } from "@/api/client";
import { invalidateQueries, useQuery } from "@/api/useQuery";
import { haptic } from "@/components/motion";
import { ErrorState, Loading } from "@/components/kit";
import { Button, Label } from "@/components/ui";
import { useSession } from "@/auth/session";
import { scheduleGameReminder } from "@/lib/reminders";
import { rememberBooking, usePlayer } from "@/player/store";
import { fonts, radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

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
  const c = usePalette();
  const styles = useStyles(makeStyles);
  return (
    <View style={{ gap: 6 }}>
      <Label color={c.text}>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[styles.input, error && { borderColor: c.tape }]}
        placeholderTextColor={c.textMuted}
        accessibilityLabel={label}
        {...input}
      />
      {error ? <Text style={[text.body, { color: c.text, fontSize: 14 }]}>{error}</Text> : null}
    </View>
  );
}

export default function Checkout() {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const p = useLocalSearchParams<{ slug: string; courtId: string; date: string; start: string; hours: string }>();
  const start = Number(p.start);
  const hours = Number(p.hours);
  const player = usePlayer();
  const venue = useQuery(`venue|${p.slug}`, () => api.venue(p.slug));

  const { user } = useSession();
  const [name, setName] = useState(player.profile?.name ?? user?.name ?? "");
  const [phone, setPhone] = useState(player.profile?.phone ?? user?.phone ?? "");
  const [payment, setPayment] = useState<PaymentMethod>("jazzcash");
  const [whatsapp, setWhatsapp] = useState(player.whatsappOk);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [pending, setPending] = useState<{ ref: string; url: string; phone: string; status: string } | null>(null);

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
      const returnUrl = Linking.createURL("/payment-return");
      const { booking, checkout } = await api.book({ venueId: v.id, courtId: court.id, date: p.date, start, hours, customer, payment, returnUrl });
      rememberBooking({ ref: booking.ref, phone: cleanPhone, venueSlug: v.slug, addedAt: new Date().toISOString() }, customer, whatsapp);

      let final = booking;
      if (checkout?.url) {
        // The provider's hosted page takes the payment; the Server confirms the booking
        // from the provider's callback, so read the status back rather than trusting the redirect.
        await WebBrowser.openAuthSessionAsync(checkout.url, returnUrl);
        final = await api.booking(booking.ref, cleanPhone);
        if (final.status !== "confirmed") {
          setPending({ ref: booking.ref, url: checkout.url, phone: cleanPhone, status: final.status });
          return;
        }
      }
      await scheduleGameReminder(final, { venue: v.name, court: court.name });
      invalidateQueries("avail|");
      invalidateQueries("mine|");
      haptic.success();
      // Back from the confirmation goes to the tabs, not to a checkout that is already done.
      if (router.canDismiss()) router.dismissAll();
      router.push({ pathname: "/booked/[ref]", params: { ref: final.ref, fresh: "1" } });
    } catch (err) {
      haptic.error();
      setFailure(err instanceof ApiError ? err : new ApiError("UNKNOWN", "Booking didn't go through. Try again."));
    } finally {
      setBusy(false);
    }
  };

  /** Back from the payment page without paying: pay again while the slot is held, or let it go. */
  const retryPayment = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await WebBrowser.openAuthSessionAsync(pending.url, Linking.createURL("/payment-return"));
      const b = await api.booking(pending.ref, pending.phone);
      if (b.status === "confirmed") {
        await scheduleGameReminder(b, { venue: v.name, court: court.name });
        if (router.canDismiss()) router.dismissAll();
        router.push({ pathname: "/booked/[ref]", params: { ref: b.ref, fresh: "1" } });
      } else {
        setPending({ ...pending, status: b.status });
      }
    } catch (err) {
      setFailure(err instanceof ApiError ? err : new ApiError("UNKNOWN", "Couldn't check the payment. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const payLabel = price === null ? "Book" : payment === "cash" ? `Book · pay ${formatRupees(price)} there` : `Pay ${formatRupees(price)} & book`;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.pad, { gap: space.xl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.summary}>
          <Label color={c.floodlight}>{v.area}</Label>
          <Text style={[text.heading, { color: c.chalk, fontSize: 26, lineHeight: 28 }]}>{v.name}</Text>
          <Text style={[text.bodyStrong, { color: c.chalk }]}>
            {court.name} · {formatWhen(p.date, start, hours)}
          </Text>
          {price !== null ? (
            <Text style={[text.heading, { color: c.floodlight, fontSize: 32, lineHeight: 34, textTransform: "none" }]}>{formatRupees(price)}</Text>
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
          <Label color={c.text}>Payment</Label>
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
                <Text style={[text.bodyStrong, { color: c.text, flex: 1 }]}>{PAYMENT_LABEL[m]}</Text>
              </Pressable>
            );
          })}
          <Text style={[text.body, styles.slate, styles.small]}>
            {payment === "cash"
              ? "The venue collects payment when you arrive."
              : "You'll finish paying on a secure payment page. The court is held for 10 minutes while you pay."}
          </Text>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: whatsapp }}
          onPress={() => setWhatsapp((w) => !w)}
          style={styles.consent}
        >
          <View style={[styles.box, whatsapp && styles.boxOn]}>{whatsapp ? <Text style={styles.tick}>✓</Text> : null}</View>
          <Text style={[text.body, { color: c.text, flex: 1, fontSize: 15, lineHeight: 22 }]}>
            Send my booking confirmation and reminders on WhatsApp. Reply STOP any time.
          </Text>
        </Pressable>

        <Text style={[text.body, styles.slate, styles.small]}>{refundLine(p.date, start, v.cancellation)}</Text>

        {failure ? <ErrorState error={failure} onRetry={failure.code === "SLOT_TAKEN" ? undefined : submit} /> : null}
        {failure?.code === "SLOT_TAKEN" ? <Button kind="outline" label="Pick another time" onPress={() => router.back()} /> : null}

        {pending ? (
          <View style={styles.pending} accessibilityLiveRegion="polite">
            <Text style={[text.subhead, { color: c.text }]}>
              {pending.status === "cancelled" ? "Payment didn't go through" : "Payment not finished yet"}
            </Text>
            <Text style={[text.body, styles.slate]}>
              {pending.status === "cancelled"
                ? "The hold on this court ended, so nothing was booked or charged. Pick the time again to book."
                : "We're holding the court for a few more minutes. Finish paying to confirm it."}
            </Text>
            {pending.status === "cancelled" ? (
              <Button kind="outline" label="Pick a time again" onPress={() => router.back()} />
            ) : (
              <Button label="Finish paying" busy={busy} onPress={retryPayment} />
            )}
          </View>
        ) : (
          <Button label={payLabel} busy={busy} onPress={submit} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  pad: { padding: space.xl, paddingBottom: space.xxl * 2 },
  slate: { color: c.textMuted },
  small: { fontSize: 14, lineHeight: 20 },
  summary: { backgroundColor: c.stage, borderRadius: radius.card, padding: space.lg, gap: space.xs },
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
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 2,
    borderColor: c.border,
    borderRadius: radius.control,
    backgroundColor: c.surface,
    paddingHorizontal: space.md,
    minHeight: 52,
  },
  optionOn: { borderColor: c.strong },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.textMuted },
  radioOn: { borderColor: c.turf, borderWidth: 6 },
  consent: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  box: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: c.strong,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxOn: { backgroundColor: c.turf, borderColor: c.turf },
  pending: { borderWidth: 2, borderColor: c.strong, borderRadius: radius.card, backgroundColor: c.surface, padding: space.lg, gap: space.md },
  tick: { color: c.chalk, fontFamily: fonts.text700, fontSize: 14, lineHeight: 16 },
});
