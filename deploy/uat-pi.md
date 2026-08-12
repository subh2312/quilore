# Raspberry Pi Gym UAT Deployment

Host the Quilore stack on a Raspberry Pi (or Pi VPS) and expose it via **Cloudflare Tunnel** for sideload APK UAT.

## Prerequisites

- Pi with **4GB+ RAM**, Docker Engine, Docker Compose v2
- Disk for images/data (prefer SSD, e.g. `/mnt/ssd/apps/quilore`)
- Cloudflare Tunnel already running (`cloudflared`)
- SSH access to the host

## Coexistence (do not disturb)

On `local-vps` this host already runs **Home Assistant** (Docker) and **Hermes** (host process on `127.0.0.1:9119`, tunnel `jarvis.sm4devlabs.dpdns.org`).

- **Do not** relocate `Docker Root Dir` (`/mnt/ssd/docker`) or rewrite Docker daemon config.
- **Do not** stop/restart Hermes or HA unless explicitly required for a conflict.
- Deploy Quilore as **additional** Compose services under `/mnt/ssd/apps/quilore`.
- Keep Quilore on loopback (`127.0.0.1:8080` / `:8000`) and publish via Cloudflare only — avoids fighting Hermes/HA LAN ports.
- Prefer pull/build on the SSD checkout path; leave SD-card root alone.

## Mock IAP — two different names (do not confuse)

| Name | What it is | Where |
|---|---|---|
| `QUILORE_ALLOW_MOCK_RECEIPTS` | **Env flag** (true/false). Master switch that allows mock store verification. | Backend `.env` / compose |
| `UAT_MOCK_RECEIPT` | **Receipt token string** the client POSTs as the receipt body when buying/restoring. | Client constant `client/lib/api/config.ts`; backend default for `QUILORE_MOCK_RECEIPT_TOKEN` |

Correct UAT settings:

```bash
QUILORE_ALLOW_MOCK_RECEIPTS=true
QUILORE_MOCK_RECEIPT_TOKEN=UAT_MOCK_RECEIPT   # optional; this is already the default
```

The old doc line `UAT_MOCK_RECEIPT=true` was wrong — that string is not a boolean env var.

Flow: client sends receipt `UAT_MOCK_RECEIPT` with `platform: mock` → backend accepts it only when `QUILORE_ALLOW_MOCK_RECEIPTS=true`.

## Deploy on Pi (Docker Compose + Cloudflare)

```bash
sudo mkdir -p /mnt/ssd/apps/quilore   # if needed; chown to your user
cd /mnt/ssd/apps
git clone https://github.com/subh2312/quilore.git quilore
cd quilore
git checkout dev   # or the UAT branch under test
cp .env.example .env
```

Edit `.env` (never commit):

```bash
JWT_SECRET=<32+ random bytes>
DATA_ENCRYPTION_KEY=<base64 32 bytes>
AI_SERVICE_INTERNAL_TOKEN=<random token>
QUILORE_ALLOW_MOCK_RECEIPTS=true
NVIDIA_NIM_API_KEY=<optional; live coach needs this>
```

**Arm64 note:** GHCR staging images may be `linux/amd64` only. On a Pi, build locally (omit staging overlay):

```bash
docker compose \
  -f docker-compose.yml \
  -f deploy/overlays/docker-compose.uat.yml \
  -f deploy/overlays/docker-compose.tunnel.yml \
  up -d --build
```

On amd64 with published images:

```bash
export BACKEND_IMAGE=ghcr.io/subh2312/quilore-backend:staging
export AI_SERVICE_IMAGE=ghcr.io/subh2312/quilore-ai-service:staging
docker compose \
  -f docker-compose.yml \
  -f deploy/overlays/docker-compose.staging.yml \
  -f deploy/overlays/docker-compose.uat.yml \
  -f deploy/overlays/docker-compose.tunnel.yml \
  up -d --no-build
```

Health (on the host):

```bash
curl -s http://127.0.0.1:8080/api/health
curl -s http://127.0.0.1:8000/health
```

## Cloudflare Tunnel ingress

Services bind to `127.0.0.1` only. Add ingress on the **running** tunnel config (often `/etc/cloudflared/config.yml`):

```yaml
ingress:
  - hostname: ssh.sm4devlabs.dpdns.org
    service: ssh://localhost:22
  # ... existing rules ...
  - hostname: quilore.sm4devlabs.dpdns.org
    service: http://127.0.0.1:8080
  - service: http_status:404
```

Create DNS (once):

```bash
cloudflared tunnel route dns sm4devlabs-pi quilore.sm4devlabs.dpdns.org
```

Reload tunnel (requires sudo if systemd-managed):

```bash
sudo cp /path/to/updated-config.yml /etc/cloudflared/config.yml
sudo systemctl restart cloudflared
```

Verify:

```bash
curl -sS https://quilore.sm4devlabs.dpdns.org/api/health
```

## Point the sideload APK at the tunnel

```bash
cd client
EXPO_PUBLIC_API_URL=https://quilore.sm4devlabs.dpdns.org npx eas-cli build -p android --profile preview
```

See `client/docs/APK_BUILD.md`.

## Deferred (honest)

- Real Google Play IAP receipt validation
- Multi-arch (`linux/arm64`) GHCR publish (until then, build on Pi)
- Sentry DSN (optional)
- k3s/Kubernetes path (optional; Compose is the supported UAT path today)
