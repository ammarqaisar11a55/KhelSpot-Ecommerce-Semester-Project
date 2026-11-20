import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SpotLogo } from "@/components/brand";
import { ChevronIcon, CourtIcon, TicketIcon } from "@/components/icons";
import { homeFor, useRole, type Role } from "@/role/RoleProvider";
import { radius, space, text, useStyles, usePalette, type Palette } from "@/theme";

const CHOICES: { role: Role; title: string; detail: string; Icon: typeof CourtIcon }[] = [
  {
    role: "player",
    title: "Book a court",
    detail: "See open slots and prices at padel, futsal, cricket and badminton courts, then pay and book.",
    Icon: TicketIcon,
  },
  {
    role: "owner",
    title: "I run a venue",
    detail: "Tonight's bookings, walk-ins, payments and your court calendar, on your phone.",
    Icon: CourtIcon,
  },
];

export default function Welcome() {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { setRole } = useRole();

  const choose = (role: Role) => {
    setRole(role);
    router.replace(homeFor(role));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}>
      <StatusBar style="light" />
      <SpotLogo on="dark" size={26} />
      <View style={styles.hero}>
        <Text style={[text.label, { color: c.floodlight }]}>Lahore · now booking</Text>
        <Text style={[text.display, { color: c.chalk }]}>{"Aaj raat\nkhelna hai?"}</Text>
      </View>
      <View style={styles.choices}>
        {CHOICES.map(({ role, title, detail, Icon }) => (
          <Pressable
            key={role}
            accessibilityRole="button"
            onPress={() => choose(role)}
            style={({ pressed }) => [styles.choice, role === "player" && styles.primary, pressed && { opacity: 0.85 }]}
          >
            <Icon color={role === "player" ? c.ink : c.floodlight} size={28} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[text.subhead, { color: role === "player" ? c.ink : c.chalk }]}>{title}</Text>
              <Text
                style={[
                  text.body,
                  { fontSize: 14, lineHeight: 20, color: role === "player" ? c.ink : c.onStageMuted },
                ]}
              >
                {detail}
              </Text>
            </View>
            <ChevronIcon color={role === "player" ? c.ink : c.chalk} />
          </Pressable>
        ))}
        <Text style={[text.body, styles.note]}>You can switch later in Account.</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.stage, paddingHorizontal: space.xl, justifyContent: "space-between" },
  hero: { gap: space.md },
  choices: { gap: space.md },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: c.stageLine,
    backgroundColor: c.stage2,
  },
  primary: { backgroundColor: c.floodlight, borderColor: c.floodlight },
  note: { color: c.onStageMuted, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: space.xs },
});
