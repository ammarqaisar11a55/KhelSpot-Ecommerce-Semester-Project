// Finds the newest mobile build for a channel on this repo's GitHub Releases.
//
// CI keeps one fixed release per channel (`mobile-beta`, `mobile-stable`) whose
// update.json names the newest build and its APK. The app downloads that file
// from github.com/…/releases/download/, which is a plain file download, not the
// GitHub API: the API allows only 60 anonymous requests an hour per network, and
// many phones in Pakistan share one address. The repo is public, so no token:
// never ship one inside the app.

import { updaterConfig } from "./config";

export type Channel = "stable" | "beta";

export interface UpdateManifest {
  versionName: string;
  versionCode: number;
  channel: Channel;
  commit: string;
  publishedAt: string;
  tag: string;
  apk: string;
  apkUrl: string;
  apkSize: number;
  sha256: string;
  minSupportedVersionCode: number;
  notes: string[];
}

export interface RemoteBuild {
  manifest: UpdateManifest;
  apkUrl: string;
  apkSize: number;
  releaseUrl: string;
  tag: string;
}

export class UpdateError extends Error {}

const releasesBase = () => `https://github.com/${updaterConfig.repo}/releases`;

function isManifest(x: unknown): x is UpdateManifest {
  const m = x as UpdateManifest;
  return (
    !!m &&
    typeof m.versionCode === "number" &&
    typeof m.versionName === "string" &&
    typeof m.tag === "string" &&
    typeof m.apkUrl === "string" &&
    // Only APKs from this repo's own releases, over HTTPS.
    m.apkUrl.startsWith(`${releasesBase()}/download/`) &&
    /^[0-9a-f]{64}$/i.test(m.sha256 ?? "") &&
    Array.isArray(m.notes)
  );
}

/** Newest build on `channel`, or null if nothing has been published there yet. */
export async function fetchLatestBuild(channel: Channel, signal?: AbortSignal): Promise<RemoteBuild | null> {
  const url = `${releasesBase()}/download/${updaterConfig.pointerPrefix}${channel}/update.json`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { "Cache-Control": "no-cache" }, signal });
  } catch {
    throw new UpdateError("Couldn't reach GitHub. Check your connection and try again.");
  }
  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 429) {
    throw new UpdateError("GitHub is busy right now. Try again in a few minutes.");
  }
  if (!res.ok) throw new UpdateError(`GitHub answered ${res.status}. Try again later.`);

  let manifest: unknown;
  try {
    manifest = await res.json();
  } catch {
    throw new UpdateError("The update file on GitHub couldn't be read. Try again later.");
  }
  if (!isManifest(manifest)) throw new UpdateError("The update file on GitHub isn't valid. Try again later.");

  return {
    manifest,
    apkUrl: manifest.apkUrl,
    apkSize: typeof manifest.apkSize === "number" ? manifest.apkSize : 0,
    releaseUrl: `${releasesBase()}/tag/${encodeURIComponent(manifest.tag)}`,
    tag: manifest.tag,
  };
}
