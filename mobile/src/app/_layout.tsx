import { Archivo_400Regular, Archivo_600SemiBold, Archivo_700Bold } from "@expo-google-fonts/archivo";
import { BigShoulders_800ExtraBold, BigShoulders_900Black } from "@expo-google-fonts/big-shoulders";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { configureNotifications } from "@/lib/reminders";
import { usePalette } from "@/theme";
import { RoleProvider } from "@/role/RoleProvider";
import { UpdaterProvider } from "@/updater/UpdaterProvider";

// Keep the Ink splash up until the brand fonts are ready, so text never flashes in a system face.
SplashScreen.preventAutoHideAsync();
configureNotifications();

export default function RootLayout() {
  const c = usePalette();
  const [loaded, error] = useFonts({
    BigShoulders_800ExtraBold,
    BigShoulders_900Black,
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_700Bold,
  });
  const ready = loaded || !!error;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Root view behind screens and the keyboard follows the theme too.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <RoleProvider>
        <UpdaterProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: c.stage },
              headerTintColor: c.chalk,
              headerTitleStyle: { fontFamily: "Archivo_700Bold" },
              contentStyle: { backgroundColor: c.bg },
              // Native slide in and swipe back from anywhere on the screen.
              animation: "slide_from_right",
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              headerBackButtonDisplayMode: "minimal",
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false, animation: "none" }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="player" options={{ headerShown: false, animation: "fade" }} />
            <Stack.Screen name="owner" options={{ headerShown: false, animation: "fade" }} />
            <Stack.Screen name="updates" options={{ title: "App updates" }} />
            <Stack.Screen name="connection" options={{ title: "Server connection" }} />
            <Stack.Screen name="venue/[slug]" options={{ title: "" }} />
            <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
            <Stack.Screen name="booked/[ref]" options={{ title: "Booking" }} />
            <Stack.Screen name="sign-in" options={{ title: "Sign in", presentation: "modal", animation: "slide_from_bottom" }} />
            <Stack.Screen name="manage/booking/[ref]" options={{ title: "Booking" }} />
            <Stack.Screen name="manage/walk-in" options={{ title: "Add a walk-in" }} />
            <Stack.Screen name="payment-return" options={{ headerShown: false }} />
          </Stack>
        </UpdaterProvider>
      </RoleProvider>
    </SafeAreaProvider>
  );
}
