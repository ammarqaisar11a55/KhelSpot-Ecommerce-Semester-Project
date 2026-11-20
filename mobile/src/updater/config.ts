import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Channel } from "./github";

interface Extra {
  variant?: "internal" | "play";
  channel?: Channel;
  commit?: string;
  updates?: { repo: string; pointerPrefix: string };
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const updaterConfig = {
  repo: extra.updates?.repo ?? "ammarqaisar11a55/KhelSpot-Ecommerce-Semester-Project",
  /** Fixed release per channel holding update.json: mobile-beta, mobile-stable. */
  pointerPrefix: extra.updates?.pointerPrefix ?? "mobile-",
  /** Channel the build was published on; the default until the user picks one. */
  builtChannel: extra.channel ?? "beta",
  commit: extra.commit ?? "local",
  variant: extra.variant ?? "internal",
};

/** What is installed on this phone. */
export const installed = {
  versionName: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "0.0.0",
  versionCode: Number(Application.nativeBuildVersion ?? 0) || 0,
};

/**
 * Only internal Android builds update themselves. Play builds update through the store,
 * iOS through TestFlight, and Expo Go / web have no APK to replace.
 */
export const canSelfUpdate =
  Platform.OS === "android" && updaterConfig.variant === "internal" && Constants.executionEnvironment !== "storeClient";
