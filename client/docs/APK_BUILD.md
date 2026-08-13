# Quilore Android APK — gym UAT sideload

Build a release APK that talks to your Pi/backend (no Play Store required).

## Prerequisites

- Node 20+ and `npm install` in `client/`
- Expo account + EAS CLI (`npm i -g eas-cli`)
- Expo project GitHub settings:
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

On any PR, add label:

```text
eas-build-android:preview
```

Syntax: `eas-build-[android|ios|all]:[profile]`. Requires `image` on the profile in `eas.json` (already set to `latest`).

### C) EAS Workflows

Workflow files live next to `eas.json` under `client/.eas/workflows/`:

| File | Trigger |
|---|---|
| `preview-android.yml` | PR labeled `eas-build-android:preview` |
| `preview-android-on-dev.yml` | Push to `dev` that touches `client/**` |

Manual run:

```bash
cd client
eas workflow:run .eas/workflows/preview-android.yml
```

Skip auto workflows with `[eas skip]`, `[skip eas]`, or `[no eas]` in the commit message.

## After the build

Download the APK from the Expo build page → sideload → open the app.  
EAS Observe metrics appear after a native preview/production build (not Expo Go).
