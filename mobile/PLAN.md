# KhelSpot Mobile App: Plan

KhelSpot app for players and venue owners, Lahore launch. Players get the same booking flow as the web app; owners get the web dashboard's daily tools, in brand kit v1.0, with a built-in updater that pulls new test builds straight from this GitHub repo.

Status: phase 0 built (brand, role choice, both tab sets, updater, CI workflow). Signing secrets not set yet, so no build has been published.

---

## 1. Goals

1. A player can find a court in Lahore, see open slots and prices, pay, and get a confirmed booking, on their phone.
2. A venue owner can see today's and upcoming bookings, add walk-ins, mark cash as paid, cancel with a refund, and edit their venue's hours and rates, on their phone.
3. The app looks and talks like the brand kit (Turf, Ink, Chalk, Floodlight; Big Shoulders and Archivo; Spot logo; the kit's voice).
4. **You can test every new build on your own phone** without a store: push to `main`, GitHub builds a signed APK, and the app offers the update in **Account › App updates**.

Out of scope for v1: owner customer lists and reports (they stay on the web dashboard), Karachi and Islamabad, iOS App Store release.

---

## 2. Decisions

| Decision | Recommendation | Why |
|---|---|---|
| Framework | **Expo SDK 58 (React Native 0.88), TypeScript, Expo Router** | Same language as Frontend and Server, so the booking domain code (time, pricing, refunds) is shared, not rewritten. Expo handles fonts, icons, splash, notifications and file downloads. |
| Platforms | **Android first**, iOS later | The self-updater installs APKs, which only Android allows outside a store. Most Lahore players are on Android. iOS testing goes through TestFlight. |
| Folder name | **`mobile/`** (renamed from `Mobile App/`) | Android's Gradle build and several React Native scripts break on paths with spaces. |
| Shared code | **npm workspace `shared/`** with `domain/` (types, time, pricing) and `brand/` (tokens) | `Server/src/domain` is already a copy of `Frontend/src/lib/domain`. A third copy would drift. All three apps import from `shared/`. |
| Data | **The Server API** (`Server/`) | The app never keeps its own booking store; the Server owns availability and prevents double booking. |
| Update source | **GitHub Releases on this repo** | Already public, free, versioned, and tied to commits. No extra service. |

---

## 3. Brand kit in the app

All values come from brand kit v1.0 (summary in `brand/BRAND.md` section 4). They live once in `shared/brand/tokens.ts` and are used by web and mobile.

**Colour**

| Token | Hex | Use in the app |
|---|---|---|
| `ink` | `#111513` | Text, tab bar, headers, night surfaces, status bar |
| `chalk` | `#F3F2EC` | Screen background |
| `turf` | `#1F7A4D` | Primary actions, Booked states, rate bars |
| `floodlight` | `#D4F53C` | Open slots, the selected filter, the "now" marker |
| `tape` | `#FF5B1F` | "2 left tonight" and time-limited offers only. Never on a screen that already uses Floodlight as its accent. Always Ink text |
| `deepTurf` `#0E3B26`, `slate` `#59625D`, `line` `#D8D7CF`, `sand` `#E4E3DC` | | Support surfaces, secondary text, borders, booked slots |

Contrast pairs from the kit: Ink on Chalk 16.4:1, Chalk on Turf 4.7:1, Ink on Floodlight 14.8:1, Ink on Tape 5.9:1. Never Chalk on Tape. Floodlight on Turf only for big headings.

**Type** (`@expo-google-fonts/big-shoulders`, `@expo-google-fonts/archivo`, loaded with `expo-font` before the splash hides)

| Role | Font | Size / line height | Notes |
|---|---|---|---|
| Display | Big Shoulders 900 | 48/43 | Screen titles. Uppercase |
| Heading | Big Shoulders 800 | 32/32 | Venue names, prices, times. Uppercase; "Rs" keeps its case |
| Subhead | Archivo 700 | 20/26 | Card titles, the booking summary |
| Body | Archivo 400 | 16/25 | Everything else |
| Label | Archivo 700 | 12, +0.14em | Small uppercase labels |

**Components**: square-cornered buttons (4 dp radius), pill filters (area, sport, day), 2 dp borders on inputs and slot cells, 8 dp cards. Primary button Floodlight with Ink text on dark screens, Turf with Chalk text on light ones. Statuses use the kit's words: Booked, Open, "2 left tonight", Full, Refunded.

**Logo and icon**
- Spot wordmark (KHELSP●T) as an `react-native-svg` component in headers and the splash.
- App icon: the K-and-dot symbol on a Turf tile at 55% of the tile height. Android adaptive icon (Turf background, symbol foreground), plus a monochrome layer for Android 13 themed icons.
- Splash: Ink background, Chalk wordmark with a Floodlight dot.

**Voice**: the kit's rules. Price, time and place first ("Court 2 · 9–10 PM · Rs 4,000"); "Booked", never "Request sent"; the cancellation deadline as a clock time; Roman Urdu where players use it ("Aaj raat khelna hai?"). Avoid: request, inquiry, subject to availability, premium experience.

---

## 4. Screens (v1)

**First launch** asks who you are: *Book a court* or *I run a venue*. The choice is saved on the phone and can be switched in Account. Each side has its own tab bar.

### Player: Courts · My bookings · Account

Same flow as the web player app, built for thumbs.

1. **Courts**: "Free courts in Lahore". Pill filters for sport, day and area; venue cards with the venue photo and the next free start times. Tapping a time goes straight to checkout.
2. **Venue**: photo header, address with Get directions, sport and court pills, 7-day strip, slot grid (free, booked, past, peak), length 1–3 hours, price breakdown, free-cancellation deadline as a clock time.
3. **Checkout**: name and WhatsApp number (remembered), payment method (JazzCash, Easypaisa, card, pay at venue where the venue allows it), a tick-box to receive booking updates on WhatsApp (required before WhatsApp messages can be sent), and "Pay Rs 4,500 & book".
4. **Booked**: confirmation in the kit's message order (status, where and when, what was paid and how, booking ID, deadline, one link). Buttons: Directions, Add to calendar, Share.
5. **My bookings**: upcoming and past. Cancel shows the refund before you confirm.
6. **Account**: profile, notifications, **App updates** (below), switch to the owner side, about and version.

### Venue owner: Today · Calendar · Bookings · Venue · Account

Mirrors the web dashboard (`Frontend/src/app/dashboard`). Owners must sign in, and only see their own venue.

1. **Sign in**: phone number and OTP, linked to the venue on the Server. Until owner auth exists, the owner tabs show what is coming.
2. **Today**: who is on court now, next arrivals, unpaid at venue, and **Add a walk-in** (court, time, name, phone, cash or paid).
3. **Calendar**: courts × hours for a day, with the now line and payment colours, same as the web calendar. Tap a slot to book a walk-in or open the booking.
4. **Bookings**: search by name, phone or booking ID; mark cash as paid; cancel (full refund when the owner cancels); call or WhatsApp the player.
5. **Venue**: opening hours, courts, peak and off-peak rates, cancellation window, photo.
6. **Account**: App updates, switch to the player side.

Notification for owners: "New booking: Court 2 · 9–10 PM · Rs 4,000" when a player books online (needs push from the Server).

Player notification "Game in 2 hours" via `expo-notifications`, scheduled when a booking is made and cancelled with it.

---

## 5. The in-app updater (GitHub Releases)

### How it works

```
push to main ──► GitHub Actions ──► signed APK + update.json ──► GitHub Release (mobile-v…)
                                                                        │
phone: Account › App updates ── reads mobile-<channel>/update.json ◄────┘
        └─ newer build? ─► shows notes ─► downloads APK ─► checks SHA-256 ─► Android installer
```

### Builds (CI)

Workflow `.github/workflows/mobile-android.yml`:

- **Triggers**: push to `main` touching `mobile/**` or `shared/**` produces a **beta** build (GitHub pre-release). A tag `mobile-v1.4.0` produces a **stable** build (normal release).
- **Version**: `versionName` from `mobile/package.json` (e.g. 1.4.0); `versionCode` = the workflow run number, so every build is higher than the last. The commit SHA is baked into the app config.
- **Steps**: checkout → Node 22, JDK 17 → `npm ci` → typecheck and lint → `APP_VARIANT=internal npx expo prebuild --platform android` → Gradle `assembleRelease` (arm64) → `apksigner` with the release key → SHA-256 → `gh release create`.
- **Tags**: beta builds are `mobile-v<version>-beta.<run>` (pre-release); stable builds are the `mobile-v<version>` tag you push, which must match `mobile/package.json`.
- **Signing**: one release keystore, created once with `mobile/scripts/create-keystore.sh`, stored as GitHub Actions secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Keep a backup offline: if it's lost, installed apps can't be updated and must be reinstalled.
- **Release assets**: `khelspot-1.4.0-57.apk` and `update.json` on the versioned release. The same `update.json` is also uploaded to a fixed release per channel, `mobile-beta` and `mobile-stable` (stable builds move both), which is what the app reads:

```json
{
  "versionName": "1.4.0",
  "versionCode": 57,
  "channel": "beta",
  "commit": "ba56926",
  "publishedAt": "2026-11-21T10:12:00Z",
  "tag": "mobile-v1.4.0-beta.57",
  "apk": "khelspot-1.4.0-57.apk",
  "apkUrl": "https://github.com/ammarqaisar11a55/KhelSpot-Ecommerce-Semester-Project/releases/download/mobile-v1.4.0-beta.57/khelspot-1.4.0-57.apk",
  "apkSize": 36664132,
  "sha256": "…",
  "minSupportedVersionCode": 50,
  "notes": ["Venue page shows the deadline as a clock time", "Fix: slot grid on small phones"]
}
```

Release notes come from the commit messages since the previous mobile release.

### In the app (Account › App updates)

- Shows: installed version and build (`expo-application`), commit, channel (Stable or Beta), last checked.
- **Check for updates**: downloads `https://github.com/ammarqaisar11a55/KhelSpot-Ecommerce-Semester-Project/releases/download/mobile-<channel>/update.json` and compares its `versionCode` with the installed build. This is a plain file download from github.com, **not the GitHub API**: the API allows only 60 anonymous requests an hour per IP address, and many Pakistani home and mobile networks put lots of people behind one address (we hit the limit on the first day). The app only accepts an `apkUrl` from this repo's own releases.
- **Update available**: version, size, date, notes, then **Download and install**: downloads the APK with progress (`expo-file-system`), checks its SHA-256 against `update.json`, then opens the Android installer through a content URI (`expo-intent-launcher`). Android asks once to allow installs from KhelSpot.
- **Automatic check** on app start, at most every 6 hours, shown as a small banner, never a blocking pop-up. If the installed build is below `minSupportedVersionCode` (an API change broke old builds), the banner says the update is required.
- **Channel switch**: Stable or Beta, for when you want every `main` build.

### Safety

- **No GitHub token in the app.** The repo is public, so release downloads need no login, and they aren't subject to the API's 60-an-hour limit. If the repo goes private, move releases to a small public `khelspot-releases` repo or have the Server serve `update.json`. Never ship a token inside an APK.
- **Two checks on every APK**: the SHA-256 from `update.json`, and Android's own rule that an update must be signed with the same key as the installed app. A tampered APK fails both.
- **HTTPS only**; downloads go to the app's cache and are deleted after install.

### Store builds

Google Play doesn't allow apps to install updates themselves. So there are two build variants from one codebase, chosen by `APP_VARIANT` in `app.config.ts`:
- **internal** (package `pk.khelspot.app.internal`): updater on, `REQUEST_INSTALL_PACKAGES` permission, distributed through GitHub Releases. This is what you test with.
- **play** (package `pk.khelspot.app`): updater off and that permission blocked. Updates come from Google Play, and the Account screen shows the version only.

iOS can't install outside the App Store or TestFlight. On iOS the App updates screen says "Updates come from TestFlight" and links there.

### Later, optional: instant JS updates

`expo-updates` can push JavaScript-only fixes without a new APK. It needs an update server; the KhelSpot Server can serve it later. Not needed for v1: APK updates from GitHub cover testing.

---

## 6. Project layout

```
shared/brand/tokens.ts    brand kit v1.0 colours, type scale, radii, spacing (Metro watches ../shared)
mobile/
  app.config.ts           name, package, versionCode (BUILD_NUMBER), variant, commit, updater repo
  src/app/                Expo Router screens
    index.tsx             sends you to welcome, player or owner
    welcome.tsx           first-launch role choice
    player/               tabs: index (Courts), bookings, account
    owner/                tabs: index (Today), calendar, bookings, venue, account
    updates.tsx           Account › App updates
  src/components/         brand (SpotLogo, LogoMark), ui (Button, Screen, Card, Tag), icons, UpdateBanner
  src/role/               RoleProvider: player or owner, saved on the phone
  src/updater/            config, github (releases), install (download, SHA-256, installer), UpdaterProvider
  src/theme/              tokens + font family names
  scripts/                make-icons.py (icon, adaptive icon, splash), create-keystore.sh
.github/workflows/mobile-android.yml
```

`shared/domain` (types, time, pricing, refunds) moves here in phase 1, when the app first needs it; Frontend and Server switch to it at the same time.

API base URL per variant: your computer's LAN address while developing (phone and laptop on the same Wi-Fi), the deployed Server for internal and play builds.

---

## 7. Phases

Each phase ends with a build installed from GitHub on your phone.

| Phase | What ships | Done when |
|---|---|---|
| **0. Foundations** | Shared brand tokens, Expo app with fonts, icon, splash, role choice, player and owner tab bars. **CI to GitHub Releases and the updater working end to end.** | You install build 1 from the release page, push a change, and build 2 arrives through Account › App updates. |
| **1. Browse** | Courts list with filters and photos; venue page with slot grid, from the Server API. Owner Calendar (read-only). | Slot grid and owner calendar match the web for the same day. |
| **2. Book** | Checkout, Booked screen, My bookings, cancel with refund quote, "Game in 2 hours" reminder. Payment step is a stand-in until provider accounts exist. | A booking made in the app shows on the web owner calendar. |
| **3. Accounts** | Phone OTP sign-in for players and owners (needs the Server's auth). Owner Today, Bookings and Venue tabs go live: walk-ins, mark paid, cancel, edit hours and rates. | An owner adds a walk-in on the phone and it shows on the web calendar. |
| **4. Payments** | JazzCash, Easypaisa and card through the providers' hosted checkout; booking confirmed by the provider's callback. | Paid booking with a real (test-mode) transaction. |
| **5. Release** | Play variant, store listing, privacy policy, TestFlight build. | Internal testing track live on Google Play. |

Phase 0 comes first on purpose: once the updater works, every later phase reaches your phone without a cable.

---

## 8. Depends on the Server

- **Deployed, reachable Server** (now it runs only on your machine with Docker). Needed from phase 1 for builds outside your Wi-Fi.
- **Auth** (phone OTP) for phase 3. Owner routes are still open (`TODO(auth)` in `Server/src/routes/owner.ts`), so the app must not show owner data until they are locked to the signed-in owner's venue.
- **Push notifications** for owners' "New booking" alerts.
- **Payment provider** callbacks for phase 4.
- **WhatsApp Business account** with approved templates, before the app promises WhatsApp confirmations.

---

## 9. Risks and open questions

- **Keystore loss** blocks updates for everyone on internal builds. Back it up offline before build 1.
- **"Install unknown apps"** prompt: testers must allow it once; the updater screen explains this before the first install.
- **Public releases**: anyone can download internal APKs from the repo. Fine for testing; switch to a private distribution if builds include anything sensitive.
- **Open**: Android only for v1, or TestFlight in parallel? Should one phone number be able to be both a player and an owner without switching?
