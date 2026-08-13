# Quilore Android APK — gym UAT sideload

Build a release APK that talks to your Pi/backend (no Play Store required).

## Prerequisites

- Node 20+ and `npm install` in `client/`
- Expo account + EAS CLI (`npm i -g eas-cli`)
- Expo project [GitHub settings](https://expo.dev/accounts/sm1523devs-team/projects/quilore/github):
  - Repository: `subh2312/quilore`
  - **Base directory:** `client` (no leading slash)
- Backend reachable at `https://quilore.sm4devlabs.dpdns.org`

## Environment

Create `client/.env` (never commit secrets):

```bash
# Cloudflare Tunnel UAT (preferred — see deploy/uat-pi.md):
EXPO_PUBLIC_API_URL=https://quilore.sm4devlabs.dpdns.org
# Optional crash reporting:
# EXPO_PUBLIC_SENTRY_DSN=https://...
```

The EAS `preview` profile also sets `EXPO_PUBLIC_API_URL` in `eas.json`.

## Build options

### A) Local CLI

```bash
cd client
eas build -p android --profile preview
```

### B) GitHub PR label (Expo GitHub App)

On any PR, add:

```text
eas-build-android:preview
```

Syntax: `eas-build-[android|ios|all]:[profile]`. Profiles must set `android.image` / `ios.image` in `eas.json` (this repo uses `latest`).

### C) EAS Workflows (`client/.eas/workflows/`)

| File | When it runs |
|---|---|
| `preview-android.yml` | Manual: `eas workflow:run .eas/workflows/preview-android.yml` |
| `preview-android-on-dev.yml` | Push to `dev` that changes `client/**` |

```bash
cd client
eas workflow:run .eas/workflows/preview-android.yml
```

Skip auto workflows with `[eas skip]`, `[skip eas]`, or `[no eas]` in the commit message.

Label builds (B) and Workflows (C) are separate: labels go through the Expo GitHub App; workflows are the YAML files above. Do not also add a workflow `on.pull_request_labeled` for `eas-build-android:preview` or you may get duplicate builds.

## After the build

Download the APK from the Expo build page → sideload → open the app.  
EAS Observe metrics appear after a native preview/production build (not Expo Go).
