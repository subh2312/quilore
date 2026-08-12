# Raspberry Pi Gym UAT Deployment

This guide covers hosting the Quilore stack on a Raspberry Pi for sideload APK UAT.

## Blocker (2026-08-12)

**SSH to Pi is not configured on this machine.**

```bash
ssh pi
# ssh: Could not resolve hostname pi: nodename nor servname provided, or not known
```

No `Host pi` entry exists in `~/.ssh/config`.

## What you need to provide

1. Pi LAN IP or hostname (e.g. `192.168.1.50`)
2. SSH user (typically `pi` or your username)
3. SSH key or password access
4. Pi with **4GB+ RAM**, Docker Engine, and Docker Compose v2

### Optional: add SSH config

```bash
# ~/.ssh/config
Host pi
  HostName 192.168.1.50
  User pi
  IdentityFile ~/.ssh/id_ed25519
```

Then verify:

```bash
ssh pi 'docker --version && docker compose version'
```

## Deploy stack on Pi

On the Pi (after cloning/pulling `cursor` merged into `dev` or checking out the UAT branch):

```bash
git clone https://github.com/subh2312/quilore.git
cd quilore
cp .env.example .env
# Edit .env — NEVER commit real keys:
#   JWT_SECRET=<32+ random bytes>
#   DATA_ENCRYPTION_KEY=<base64 32 bytes>
#   NVIDIA_NIM_API_KEY=<server-side only>
#   UAT_MOCK_RECEIPT=true   # enables mock IAP for gym UAT

docker compose \
  -f docker-compose.yml \
  -f deploy/overlays/docker-compose.staging.yml \
  up -d --build
```

Verify health:

```bash
curl -s http://127.0.0.1:8080/api/health
curl -s http://127.0.0.1:8000/health
```

## Point the sideload APK at Pi

Build the preview APK with EAS (see `client/docs/APK_BUILD.md`):

```bash
cd client
EXPO_PUBLIC_API_URL=http://<PI_LAN_IP>:8080 npx eas build --profile preview --platform android
```

For gym Wi‑Fi UAT, devices must reach `http://<PI_LAN_IP>:8080` on the LAN. Android 9+ may require cleartext allowance — the preview build uses HTTP for local UAT only.

Example:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:8080
```

## Off-LAN testers (later)

Use Cloudflare Tunnel per `deploy/README.md` and `deploy/overlays/docker-compose.tunnel.yml` instead of exposing port 8080 publicly.

## Mock IAP for UAT

With `UAT_MOCK_RECEIPT=true` on the backend, the client sends receipt `UAT_MOCK_RECEIPT` on purchase/restore to unlock PREMIUM without Play Console. Real Play IAP validation remains deferred to post-license launch.

## Deferred (honest)

- Real Google Play IAP receipt validation
- Sentry DSN (optional; local crash sink works for UAT)
- Production TLS domain (Pi LAN HTTP is UAT-only)
