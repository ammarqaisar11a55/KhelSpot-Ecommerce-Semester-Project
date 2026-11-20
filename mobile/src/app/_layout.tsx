import { Archivo_400Regular, Archivo_600SemiBold, Archivo_700Bold } from "@expo-google-fonts/archivo";
import { BigShoulders_800ExtraBold, BigShoulders_900Black } from "@expo-google-fonts/big-shoulders";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/theme";
import { RoleProvider } from "@/role/RoleProvider";
import { UpdaterProvider } from "@/updater/UpdaterProvider";

// Keep the Ink splash up until the brand fonts are ready, so text never flashes in a system face.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <RoleProvider>
        <UpdaterProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.ink },
              headerTintColor: colors.chalk,
              headerTitleStyle: { fontFamily: "Archivo_700Bold" },
              contentStyle: { backgroundColor: colors.chalk },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="player" options={{ headerShown: false }} />
            <Stack.Screen name="owner" options={{ headerShown: false }} />
            <Stack.Screen name="updates" options={{ title: "App updates" }} />
            <Stack.Screen name="connection" options={{ title: "Server connection" }} />
            <Stack.Screen name="venue/[slug]" options={{ title: "" }} />
            <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
            <Stack.Screen name="booked/[ref]" options={{ title: "Booking" }} />
          </Stack>
        </UpdaterProvider>
      </RoleProvider>
    </SafeAreaProvider>
  );
}
