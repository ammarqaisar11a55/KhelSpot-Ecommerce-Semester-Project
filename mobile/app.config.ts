/// <reference types="node" />
import { execSync } from "node:child_process";
import type { ConfigContext, ExpoConfig } from "expo/config";
import pkg from "./package.json";

// Build variants (see PLAN.md §5):
//   internal  (default) self-updates from GitHub Releases; needs REQUEST_INSTALL_PACKAGES.
//   play      for Google Play: no updater, and that permission is blocked.
type Variant = "internal" | "play";
const variant: Variant = process.env.APP_VARIANT === "play" ? "play" : "internal";

// CI sets BUILD_NUMBER to the workflow run number, so every build is higher than the last.
const versionCode = Number(process.env.BUILD_NUMBER ?? 1);
const channel = process.env.RELEASE_CHANNEL === "stable" ? "stable" : "beta";

function gitCommit(): string {
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "local";
  }
}

const INK = "#111513";
const TURF = "#1F7A4D";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "KhelSpot",
  slug: "khelspot",
  version: pkg.version,
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "khelspot",
  userInterfaceStyle: "light",
  backgroundColor: "#F3F2EC",
  ios: {
    bundleIdentifier: "pk.khelspot.app",
    buildNumber: String(versionCode),
    supportsTablet: false,
  },
  android: {
    package: variant === "play" ? "pk.khelspot.app" : "pk.khelspot.app.internal",
    versionCode,
    adaptiveIcon: {
      backgroundColor: TURF,
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    permissions: variant === "internal" ? ["android.permission.REQUEST_INSTALL_PACKAGES"] : [],
    blockedPermissions: variant === "play" ? ["android.permission.REQUEST_INSTALL_PACKAGES"] : [],
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "single",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: INK,
        image: "./assets/images/splash-icon.png",
        imageWidth: 220,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    variant,
    channel,
    commit: gitCommit(),
    updates: {
      // Public repo: release reads need no token. Never put a GitHub token in the app.
      repo: "ammarqaisar11a55/KhelSpot-Ecommerce-Semester-Project",
      tagPrefix: "mobile-v",
    },
  },
});
