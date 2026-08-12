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

## EAS preview APK

```bash
cd client
npx eas-cli build -p android --profile preview
```

See `eas.json` for the preview profile (`buildType: apk`).
