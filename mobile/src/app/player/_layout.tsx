import { Tabs } from "expo-router/tabs";
import { CourtIcon, PersonIcon, TicketIcon } from "@/components/icons";
import { tabScreenOptions } from "@/components/tabBar";
import { usePalette } from "@/theme";

/** Player side: find a court, see your bookings. */
export default function PlayerTabs() {
  const c = usePalette();
  return (
    <Tabs screenOptions={tabScreenOptions(c)}>
      <Tabs.Screen name="index" options={{ title: "Courts", tabBarIcon: ({ color }) => <CourtIcon color={color} /> }} />
      <Tabs.Screen
        name="bookings"
        options={{ title: "My bookings", tabBarIcon: ({ color }) => <TicketIcon color={color} /> }}
      />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: ({ color }) => <PersonIcon color={color} /> }} />
    </Tabs>
  );
}
