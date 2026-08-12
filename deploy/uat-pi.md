# Raspberry Pi Gym UAT — preferred path

**Canonical path:** merge to `dev` → GitHub Actions publishes **`linux/arm64` only for changed services** → auto-deploys those services to the Pi (`publish-images.yml` + `deploy/scripts/deploy-pi.sh`).  
Client/RN changes do not redeploy server containers (mobile pipeline next).

Do **not** publish amd64. Do **not** relocate Docker root (Hermes / HA stay put).

See `deploy/README.md` (Pi auto-deploy secrets) and `deploy/k8s/README.md` (optional k3s manifests).

## Mock IAP — two different names

| Name | What it is |
|---|---|
| `QUILORE_ALLOW_MOCK_RECEIPTS` | Boolean **env flag** (master switch) |
| `UAT_MOCK_RECEIPT` | Receipt **token string** the client POSTs (`QUILORE_MOCK_RECEIPT_TOKEN` default) |

`UAT_MOCK_RECEIPT=true` is wrong — that string is not a boolean env var.

## Cloudflare

DNS CNAME (once): `cloudflared tunnel route dns sm4devlabs-pi quilore.sm4devlabs.dpdns.org`

Add ingress on the **running** tunnel config (`/etc/cloudflared/config.yml`, needs sudo):

```yaml
  - hostname: quilore.sm4devlabs.dpdns.org
    service: http://127.0.0.1:8080
```

Then `sudo systemctl restart cloudflared`.

APK: `EXPO_PUBLIC_API_URL=https://quilore.sm4devlabs.dpdns.org` (see `client/docs/APK_BUILD.md`).

## Fallback (not preferred)

Compose overlays under `deploy/overlays/` remain for local/dev. Building on the Pi is an emergency fallback only when GHCR arm64 tags are missing.

## Coexistence

- Hermes on `127.0.0.1:9119` (jarvis tunnel) — leave running
- Home Assistant — leave running
- Docker data root `/mnt/ssd/docker` — do not move
