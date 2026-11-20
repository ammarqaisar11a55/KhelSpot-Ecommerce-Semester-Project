# KhelSpot mobile

Android app (Expo SDK 58) for players and venue owners. On first launch it asks *Book a court* or *I run a venue*; each side has its own tabs. Plan and phases: [PLAN.md](PLAN.md).

## Run it

```bash
npm install
npx expo start          # press w for web, or scan the QR code with a development build
```

The updater and the APK installer only work in a real Android build, not in Expo Go or on web.

```bash
npx tsc --noEmit && npx expo lint && npx expo-doctor
```

## Builds on your phone (one-time setup)

1. Create the release keystore and back it up offline:
   `bash scripts/create-keystore.sh` (writes to `~/khelspot-keys/`, prints the secrets to add).
2. Add the four `ANDROID_*` secrets to the GitHub repo.
3. Push to `main` with a change under `mobile/` or `shared/`. The **Mobile Android build** workflow publishes a Beta pre-release with the APK and `update.json`.
4. On the phone, open the release page, download the APK and install it (allow installs from your browser once).
5. From then on: push to `main`, then open **Account › App updates** and tap **Download and install**.

Stable builds: bump `version` in `package.json`, then push the tag `mobile-v<version>`.
If a Server change breaks old builds, raise `khelspot.minSupportedVersionCode` in `package.json`; older builds then show "Update required".

## Icons and splash

Generated from the brand kit's K symbol and Big Shoulders:

```bash
python3 scripts/make-icons.py
```
