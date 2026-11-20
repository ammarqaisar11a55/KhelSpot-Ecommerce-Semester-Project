// Download the APK into the app's cache, check its SHA-256 against update.json,
// then hand it to Android's package installer. Android also refuses any APK not
// signed with the same key as the installed app, so a tampered file fails twice.

import { Directory, File, Paths } from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import { UpdateError, type RemoteBuild } from "./github";

const FLAG_GRANT_READ_URI_PERMISSION = 1;
const APK_MIME = "application/vnd.android.package-archive";

function apkFile(versionCode: number) {
  return new File(Paths.cache, `khelspot-${versionCode}.apk`);
}

export async function downloadBuild(
  build: RemoteBuild,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<File> {
  const target = apkFile(build.manifest.versionCode);
  if (target.exists) target.delete();

  let file: File;
  try {
    file = await File.downloadFileAsync(build.apkUrl, target, {
      idempotent: true,
      signal,
      onProgress: ({ bytesWritten, totalBytes }) => {
        const total = totalBytes > 0 ? totalBytes : build.apkSize;
        if (total > 0) onProgress(Math.min(1, bytesWritten / total));
      },
    });
  } catch (e) {
    if (target.exists) target.delete();
    if (signal?.aborted) throw new UpdateError("Download cancelled.");
    throw new UpdateError(`Download failed: ${e instanceof Error ? e.message : "unknown error"}.`);
  }

  const digest = (await file.digest("SHA-256")).toLowerCase();
  if (digest !== build.manifest.sha256.toLowerCase()) {
    file.delete();
    throw new UpdateError("The downloaded file doesn't match this build's checksum, so it was deleted. Try again.");
  }
  return file;
}

/** Opens the system installer. Resolves when the user leaves it (installing replaces this app). */
export async function installApk(file: File) {
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: file.contentUri,
    type: APK_MIME,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}

/** Opens Settings › Install unknown apps for KhelSpot, in case the user said no the first time. */
export async function openInstallPermissionSettings(packageName: string | null) {
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
    data: packageName ? `package:${packageName}` : undefined,
  });
}

/** Deletes downloaded APKs for builds that are already installed (or older). */
export function cleanUpDownloads(installedVersionCode: number) {
  try {
    for (const entry of new Directory(Paths.cache).list()) {
      const m = entry instanceof File ? /^khelspot-(\d+)\.apk$/.exec(entry.name) : null;
      if (m && Number(m[1]) <= installedVersionCode) entry.delete();
    }
  } catch {
    // Cache cleanup is best effort.
  }
}
