// Finds the newest mobile build on this repo's GitHub Releases.
// Each release tagged `mobile-v…` carries the APK and an update.json manifest (PLAN.md §5).
// The repo is public, so no token: never ship one inside the app.

import { updaterConfig } from "./config";

export type Channel = "stable" | "beta";

export interface UpdateManifest {
  versionName: string;
  versionCode: number;
  channel: Channel;
  commit: string;
  publishedAt: string;
  apk: string;
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

interface GhAsset {
  name: string;
  size: number;
  browser_download_url: string;
}
interface GhRelease {
  tag_name: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  assets: GhAsset[];
}

export class UpdateError extends Error {}

function isManifest(x: unknown): x is UpdateManifest {
  const m = x as UpdateManifest;
  return (
    !!m &&
    typeof m.versionCode === "number" &&
    typeof m.versionName === "string" &&
    typeof m.apk === "string" &&
    /^[0-9a-f]{64}$/i.test(m.sha256 ?? "") &&
    Array.isArray(m.notes)
  );
}

/** Newest build on `channel`. Beta sees pre-releases (every push to main) and stable releases. */
export async function fetchLatestBuild(channel: Channel, signal?: AbortSignal): Promise<RemoteBuild | null> {
  const { repo, tagPrefix } = updaterConfig;
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=20`, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal,
    });
  } catch {
    throw new UpdateError("Couldn't reach GitHub. Check your connection and try again.");
  }
  if (res.status === 403 || res.status === 429) {
    throw new UpdateError("GitHub is limiting checks from this network. Try again in an hour.");
  }
  if (!res.ok) throw new UpdateError(`GitHub answered ${res.status}. Try again later.`);

  const releases = (await res.json()) as GhRelease[];
  const candidates = releases.filter(
    (r) => r.tag_name.startsWith(tagPrefix) && !r.draft && (channel === "beta" || !r.prerelease),
  );

  for (const release of candidates) {
    const manifestAsset = release.assets.find((a) => a.name === "update.json");
    if (!manifestAsset) continue;
    const mRes = await fetch(manifestAsset.browser_download_url, { signal });
    if (!mRes.ok) continue;
    const manifest: unknown = await mRes.json();
    if (!isManifest(manifest)) continue;
    const apk = release.assets.find((a) => a.name === manifest.apk);
    if (!apk || !apk.browser_download_url.startsWith("https://")) continue;
    return {
      manifest,
      apkUrl: apk.browser_download_url,
      apkSize: apk.size,
      releaseUrl: release.html_url,
      tag: release.tag_name,
    };
  }
  return null;
}
