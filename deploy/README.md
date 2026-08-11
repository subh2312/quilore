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

1. Open a PR into `dev` → CI lint/tests + Docker build validation run.
2. Merge to `dev` → publish workflow pushes versioned staging images and a `versions.env` artifact.
3. Smoke-test staging (compose overlay below).
4. Run **Promote — Staging to Production** with:
   - `version`: the staging/release tag (e.g. `staging-a1b2c3d` or `v1.2.3`)
   - `confirm`: `promote-to-production`
5. Production `:production` tags move to that immutable digest (no rebuild).

## Apply on a VPS / local host

**Primary path (Cloudflare Tunnel + loopback):**

```bash
export BACKEND_IMAGE=ghcr.io/<owner>/quilore-backend:staging-<sha>
export AI_SERVICE_IMAGE=ghcr.io/<owner>/quilore-ai-service:staging-<sha>
export JWT_SECRET='<32+ byte secret>'
export DATA_ENCRYPTION_KEY='<base64 32 random bytes>'
docker compose \
  -f docker-compose.yml \
  -f deploy/overlays/docker-compose.staging.yml \
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
