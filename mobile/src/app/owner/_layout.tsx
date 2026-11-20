import { Tabs } from "expo-router/tabs";
import { CalendarIcon, FloodlightIcon, PersonIcon, TicketIcon, VenueIcon } from "@/components/icons";
import { tabScreenOptions } from "@/components/tabBar";
import { usePalette } from "@/theme";

/** Venue owner side, mirroring the web dashboard: Today, Calendar, Bookings, Venue. */
export default function OwnerTabs() {
  const c = usePalette();
  return (
    <Tabs screenOptions={tabScreenOptions(c)}>
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: ({ color }) => <FloodlightIcon color={color} /> }} />
      <Tabs.Screen
        name="calendar"
        options={{ title: "Calendar", tabBarIcon: ({ color }) => <CalendarIcon color={color} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: "Bookings", tabBarIcon: ({ color }) => <TicketIcon color={color} /> }}
      />
      <Tabs.Screen name="venue" options={{ title: "Venue", tabBarIcon: ({ color }) => <VenueIcon color={color} /> }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: ({ color }) => <PersonIcon color={color} /> }} />
    </Tabs>
  );
}
