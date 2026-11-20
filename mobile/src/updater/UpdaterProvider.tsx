// App-wide updater state: checks GitHub on start (at most every 6 hours), and
// drives Account › App updates and the "update ready" banner.

import * as Application from "expo-application";
import type { File } from "expo-file-system";
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { readJson, writeJson } from "@/lib/storage";
import { canSelfUpdate, installed, updaterConfig } from "./config";
import { UpdateError, fetchLatestBuild, type Channel, type RemoteBuild } from "./github";
import { cleanUpDownloads, downloadBuild, installApk, openInstallPermissionSettings } from "./install";

const AUTO_CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

export type UpdaterStatus =
  | "unsupported"
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

interface Settings {
  channel: Channel;
  lastChecked: string | null;
}

export interface Updater {
  status: UpdaterStatus;
  channel: Channel;
  lastChecked: Date | null;
  build: RemoteBuild | null;
  /** The installed build is older than the newest build supports: the update is required. */
  required: boolean;
  progress: number;
  error: string | null;
  check: () => Promise<void>;
  download: () => Promise<void>;
  install: () => Promise<void>;
  cancel: () => void;
  setChannel: (c: Channel) => void;
  openInstallSettings: () => Promise<void>;
}

function readSettings(): Settings {
  const s = readJson<Partial<Settings>>("updater-settings");
  return {
    channel: s?.channel === "stable" || s?.channel === "beta" ? s.channel : updaterConfig.builtChannel,
    lastChecked: s?.lastChecked ?? null,
  };
}

const writeSettings = (s: Settings) => writeJson("updater-settings", s);

const UpdaterContext = createContext<Updater | null>(null);

export function UpdaterProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() =>
    canSelfUpdate ? readSettings() : { channel: updaterConfig.builtChannel, lastChecked: null },
  );
  const [status, setStatus] = useState<UpdaterStatus>(canSelfUpdate ? "idle" : "unsupported");
  const [build, setBuild] = useState<RemoteBuild | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const saveSettings = useCallback((next: Settings) => {
    setSettings(next);
    writeSettings(next);
  }, []);

  const runCheck = useCallback(
    async (channel: Channel) => {
      if (!canSelfUpdate) return;
      setStatus("checking");
      setError(null);
      try {
        const latest = await fetchLatestBuild(channel);
        saveSettings({ channel, lastChecked: new Date().toISOString() });
        if (latest && latest.manifest.versionCode > installed.versionCode) {
          setBuild(latest);
          setStatus("available");
        } else {
          setBuild(latest);
          setStatus("up-to-date");
        }
      } catch (e) {
        setError(e instanceof UpdateError ? e.message : "Couldn't check for updates.");
        setStatus("error");
      }
    },
    [saveSettings],
  );

  // On start: clear installed APKs, then check if the last check is over 6 hours old.
  useEffect(() => {
    if (!canSelfUpdate) return;
    cleanUpDownloads(installed.versionCode);
    const last = settings.lastChecked ? Date.parse(settings.lastChecked) : 0;
    if (Date.now() - last <= AUTO_CHECK_EVERY_MS) return;
    // A moment after start, so the check doesn't compete with the first screen.
    const t = setTimeout(() => void runCheck(settings.channel), 2000);
    return () => clearTimeout(t);
    // Run once per app start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = useCallback(() => runCheck(settings.channel), [runCheck, settings.channel]);

  const download = useCallback(async () => {
    if (!build) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("downloading");
    setProgress(0);
    setError(null);
    try {
      fileRef.current = await downloadBuild(build, setProgress, controller.signal);
      setStatus("ready");
      await installApk(fileRef.current);
    } catch (e) {
      setError(e instanceof UpdateError ? e.message : "Couldn't open the installer.");
      setStatus(fileRef.current ? "ready" : "error");
    } finally {
      abortRef.current = null;
    }
  }, [build]);

  const install = useCallback(async () => {
    if (!fileRef.current?.exists) return download();
    setError(null);
    try {
      await installApk(fileRef.current);
    } catch {
      setError("Couldn't open the installer.");
    }
  }, [download]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const setChannel = useCallback(
    (channel: Channel) => {
      if (channel === settings.channel) return;
      saveSettings({ ...settings, channel });
      void runCheck(channel);
    },
    [runCheck, saveSettings, settings],
  );

  const openInstallSettings = useCallback(() => openInstallPermissionSettings(Application.applicationId), []);

  const value: Updater = {
    status,
    channel: settings.channel,
    lastChecked: settings.lastChecked ? new Date(settings.lastChecked) : null,
    build,
    required: !!build && installed.versionCode < build.manifest.minSupportedVersionCode,
    progress,
    error,
    check,
    download,
    install,
    cancel,
    setChannel,
    openInstallSettings,
  };

  return <UpdaterContext value={value}>{children}</UpdaterContext>;
}

export function useUpdater(): Updater {
  const u = use(UpdaterContext);
  if (!u) throw new Error("useUpdater must be used inside <UpdaterProvider>");
  return u;
}
