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

1. Create the release keystore: `bash scripts/create-keystore.sh --set-secrets owner/repo`. It writes the keystore and a password file to `~/khelspot-keys/` (the password is never printed). Back both up offline.
2. The same command sets the four `ANDROID_*` secrets on the repo. Without `--set-secrets` it prints the `gh secret set` commands instead.
3. Push to `main` with a change under `mobile/` or `shared/`. The **Mobile Android build** workflow publishes a Beta pre-release with the APK and `update.json`.
4. On the phone, open the release page, download the APK and install it (allow installs from your browser once).
5. From then on: push to `main`, then open **Account › App updates** and tap **Download and install**.

   Build 1 checked GitHub's API, which allows only 60 anonymous requests an hour per network, so its check can fail with "GitHub is limiting checks". If it does, install build 2 once from its release page; from build 2 on, the app reads `releases/download/mobile-<channel>/update.json`, which has no such limit.

Stable builds: bump `version` in `package.json`, then push the tag `mobile-v<version>`.
If a Server change breaks old builds, raise `khelspot.minSupportedVersionCode` in `package.json`; older builds then show "Update required".

## Talking to the Server from a phone

Until the Server is deployed, run it and the website on your laptop, put the phone on the same Wi-Fi, and set
**Account › Server connection** to `http://<laptop-ip>:4000` (`hostname -I` shows the address). Internal builds allow
plain http for this; Play builds don't. Venue photos load from the website on port 3000 of the same machine.

## Icons and splash

Generated from the brand kit's K symbol and Big Shoulders:

```bash
python3 scripts/make-icons.py
```
