// Small synchronous key-value storage for app preferences (role, updater settings).
// A JSON file in the app's documents folder on phones, localStorage on web.

import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

export function readJson<T>(key: string): T | null {
  try {
    if (Platform.OS === "web") {
      const raw = globalThis.localStorage?.getItem(`khelspot:${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const f = new File(Paths.document, `${key}.json`);
    return f.exists ? (JSON.parse(f.textSync()) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(`khelspot:${key}`, JSON.stringify(value));
      return;
    }
    const f = new File(Paths.document, `${key}.json`);
    if (!f.exists) f.create();
    f.writeSync(JSON.stringify(value));
  } catch {
    // Preferences are best effort: the app asks again next time.
  }
}
