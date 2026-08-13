# Quilore Deployment & Environment Promotion

Operational guide for Story 16.4 (CI/CD pipeline and environment promotion).

## Channels

| Channel | Source | Image tags | How it updates |
|---|---|---|---|
| **CI / PR** | Pull requests to `dev` | Local build only (`push: false`) | `.github/workflows/ci.yml` |
| **Staging** | Merge / push to `dev` | `staging-<sha>`, `sha-<sha>`, `staging` | `.github/workflows/publish-images.yml` |
| **Release candidate** | Git tag `v*.*.*` | `vX.Y.Z`, `sha-<sha>`, `release` | `.github/workflows/publish-images.yml` |
| **Production** | Manual promotion | `production`, `prod-<version>` | `.github/workflows/promote.yml` |

Registry: `ghcr.io/<owner>/quilore-backend` and `ghcr.io/<owner>/quilore-ai-service`.

## Happy path

1. Open a PR into `dev` → CI runs **only for changed paths** (backend / ai-service / client / deploy).
2. Merge to `dev` → `publish-images.yml`:
   - Builds/publishes **linux/arm64** images **only for changed server services**
   - Deploys those services to the Pi (`deploy/scripts/deploy-pi.sh`) when deploy secrets are set
   - Client-only changes do **not** publish or redeploy server images (mobile CD comes next)
3. Smoke-test staging / Pi (`https://quilore.sm4devlabs.dpdns.org/api/health` once Cloudflare ingress is applied).
4. Run **Promote — Staging to Production** with:
   - `version`: the staging/release tag (e.g. `staging-a1b2c3d` or `v1.2.3`)
   - `confirm`: `promote-to-production`
5. Production `:production` tags move to that immutable digest (no rebuild).

### Pi auto-deploy secrets (required for step 2 deploy)

Repo → Settings → Secrets and variables → Actions:

| Secret | Example |
|---|---|
| `DEPLOY_HOST` | `ssh.sm4devlabs.dpdns.org` |
| `DEPLOY_USER` | `subh` |
| `DEPLOY_SSH_KEY` | private key authorized on the Pi (e.g. quilore-agent) |
| `DEPLOY_PATH` | `/mnt/ssd/apps/quilore` |

Also seed `${DEPLOY_PATH}/.env` on the Pi once (JWT/encryption/internal token/mock receipts). Hermes/HA are left alone; Docker root is not moved.

### Pi deploy: `mkdir … Input/output error`

If **Deploy changed services to Pi** fails with `mkdir: cannot create directory ‘/mnt/ssd/apps’: Input/output error`, GHCR publish already succeeded. The Pi SSD mount (Docker data-root lives there too) is unhealthy.

On the Pi:

```bash
mount | grep ssd
sudo dmesg -T | tail -40
# if the USB/SATA disk dropped:
sudo umount /mnt/ssd || true
sudo fsck -y /dev/disk/by-label/<ssd>   # use the real device
sudo mount /mnt/ssd
ls -ld /mnt/ssd/apps/quilore
```

Then re-run **Publish — Versioned Container Images** (workflow_dispatch) for `dev`. Do not relocate Docker root.

## Apply on a VPS / local host

Images are **`linux/arm64` only** (Pi / ARM hosts). There is no amd64 publish channel.

**Preferred path (k3s + GHCR):** see `deploy/k8s/README.md`.

**Compose fallback (Cloudflare Tunnel + loopback):**

```bash
export BACKEND_IMAGE=ghcr.io/<owner>/quilore-backend:staging-<sha>
export AI_SERVICE_IMAGE=ghcr.io/<owner>/quilore-ai-service:staging-<sha>
export JWT_SECRET='<32+ byte secret>'
export DATA_ENCRYPTION_KEY='<base64 32 random bytes>'
docker compose \
  -f docker-compose.yml \
  -f deploy/overlays/docker-compose.staging.yml \
  -f deploy/overlays/docker-compose.uat.yml \
  -f deploy/overlays/docker-compose.tunnel.yml \
  up -d --no-build
```

Point Cloudflare Tunnel ingress at `http://127.0.0.1:8080` (backend) and
`http://127.0.0.1:8000` (AI). See `deploy/overlays/cloudflared-config.example.yml`.
Host ports `80`/`443` and Caddy are **not** required for this path.

Compose helper:

```bash
bash deploy/scripts/apply-env.sh staging
bash deploy/tests/test_tunnel_overlay.sh
```

**Optional Caddy TLS path** (non-tunnel only): `deploy/overlays/docker-compose.tls.yml`.

Production image pins:

```bash
export BACKEND_IMAGE=ghcr.io/<owner>/quilore-backend:production
export AI_SERVICE_IMAGE=ghcr.io/<owner>/quilore-ai-service:production
bash deploy/scripts/apply-env.sh production
```

Optional GitHub Actions secrets for remote apply from promote/rollback workflows:
`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`.

Create a GitHub Environment named `production` (and optionally `staging`) so promotion/rollback require environment protection rules.

## Rollback procedure (tested)

1. Identify the last known-good promoted version (`prod-<version>` still present in GHCR).
2. Run **Rollback — Restore Previous Production Images** with:
   - `version`: that version
   - `confirm`: `rollback-production`
3. The workflow dry-runs `deploy/scripts/rollback.sh`, then retags `:production` onto `prod-<version>` via crane.
4. If `DEPLOY_*` secrets are set, the host re-pulls the restored pins.

Local dry-run (no registry mutation):

```bash
bash deploy/scripts/rollback.sh \
  --backend-image ghcr.io/<owner>/quilore-backend \
  --ai-image ghcr.io/<owner>/quilore-ai-service \
  --version staging-deadbeef \
  --dry-run
```

Script contract tests (also run in CI):

```bash
bash deploy/tests/test_promote_rollback.sh
```

## Design notes

- Promotion never rebuilds from source; it retags digests already published and tested.
- Confirmation strings reduce accidental production mutations.
- Staging and production share the same compose base; overlays only swap image pins and profile env vars.
- Orchestrator/PR-evidence hooks are intentionally out of scope here (previously reverted on `dev`).
