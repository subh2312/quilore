# Quilore Android APK — gym UAT sideload

Build a release APK that talks to your Pi/backend over LAN (no Play Store required).

## Prerequisites

- Node 20+ and `npm install` in `client/`
- Android SDK + JDK 17 (for local Gradle build) **or** EAS CLI account
- Backend running and reachable (e.g. `EXPO_PUBLIC_API_URL=http://<pi-ip>:8080`)

## Environment

Create `client/.env` (never commit secrets):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080
# Optional crash reporting:
# EXPO_PUBLIC_SENTRY_DSN=https://...
```

## Option A — EAS cloud build (APK)

```bash
cd client
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

The `preview` profile in `eas.json` outputs an **APK** (`buildType: apk`) for sideload.

Download the artifact from the EAS dashboard and install:

```bash
adb install quilore-preview.apk
```

## Option B — Local release APK

```bash
cd client
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

APK path: `android/app/build/outputs/apk/release/app-release.apk`

Sign with your keystore before distributing outside dev (UAT can use debug signing locally).

## Pointing at Raspberry Pi / staging

1. Set `EXPO_PUBLIC_API_URL` to the Pi LAN IP before build (baked into JS bundle at build time).
2. Ensure gym Wi‑Fi allows HTTP to Pi port 8080, or use Cloudflare Tunnel + HTTPS URL.
3. Log in via the app once auth UI lands; until then, mock IAP uses `UAT_MOCK_RECEIPT` when backend endpoints exist.

## Verify

- Workout tab: voice stub, PDF import, session summary card after finish
- Chat: calls `POST /api/coach/chat` (local fallback if cursor branch not merged)
- Nutrition: `POST /api/nutrition/meals/calculate` + food-quality fallback
- Profile: mock purchase/restore → billing API
- Admin link (SUPPORT role): `/admin/food-aliases`
