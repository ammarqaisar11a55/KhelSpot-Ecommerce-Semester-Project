// "Game in 2 hours" reminders: a local notification scheduled on the phone when a
// booking is confirmed and removed when it is cancelled. No push server needed.

import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";
import { formatRange, slotStart } from "@shared/domain/time";
import type { Booking } from "@shared/domain/types";
import { remindersEnabled } from "@/player/store";
import { colors } from "@/theme";

const CHANNEL = "reminders";
const LEAD_MS = 2 * 60 * 60 * 1000;
const id = (ref: string) => `game-${ref}`;

let configured = false;

/** Show reminders even while the app is open. Call once at start. */
export function configureNotifications() {
  if (configured || Platform.OS === "web") return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Game reminders",
      description: "A reminder 2 hours before a court you booked",
      importance: AndroidImportance.HIGH,
      lightColor: colors.floodlight,
    });
  }
}

async function allowed(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Schedules the reminder; returns false when it's too late or notifications are off. */
export async function scheduleGameReminder(
  b: Pick<Booking, "ref" | "date" | "start" | "hours">,
  where: { venue: string; court: string },
): Promise<boolean> {
  if (Platform.OS === "web" || !remindersEnabled()) return false;
  const at = slotStart(b.date, b.start).getTime() - LEAD_MS;
  if (at <= Date.now() + 60_000) return false;
  try {
    if (!(await allowed())) return false;
    await Notifications.cancelScheduledNotificationAsync(id(b.ref)).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: id(b.ref),
      content: {
        title: "Game in 2 hours",
        body: `${where.court} · ${formatRange(b.start, b.hours)} · ${where.venue}`,
        data: { url: `khelspot://booked/${b.ref}` },
        color: colors.turf,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelGameReminder(ref: string) {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(id(ref)).catch(() => {});
}

/** "khelspot://booked/KS-AB123" -> "KS-AB123" */
function refFrom(response: Notifications.NotificationResponse | null): string | null {
  const url = response?.notification.request.content.data?.url;
  const m = typeof url === "string" ? /booked\/([A-Z0-9-]+)/i.exec(url) : null;
  return m ? m[1] : null;
}

/** Tapping a reminder opens that booking, whether the app was running or just launched by the tap. */
export function useReminderTaps(ready: boolean) {
  useEffect(() => {
    if (!ready || Platform.OS === "web") return;
    const open = (r: Notifications.NotificationResponse | null) => {
      const ref = refFrom(r);
      if (ref) router.push({ pathname: "/booked/[ref]", params: { ref } });
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      open(last);
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
}
