# Secret Management & Encryption Baseline (Story 15.2)

## Rules

1. **Never commit real secrets.** `.env` is gitignored; only `.env.example` with empty/placeholder values belongs in git.
2. **TLS for all external traffic.** Use the TLS compose overlay (Caddy) in staging/production so clients never hit backend/AI HTTP ports directly.
3. **Field encryption.** Sensitive user fields use AES-256-GCM via `quilore.security.data-encryption-key` (32-byte key, base64-encoded).
4. **Provider keys** (`GROQ_API_KEY`, etc.) live in the host secret store / GitHub Environments / VPS env files — not in images or source.

## Required secrets

| Name | Owner | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | Infra | Rotate with DB role password change |
| `MINIO_ROOT_PASSWORD` | Infra | Rotate MinIO credentials + update clients |
| `JWT_SECRET` | Spring Boot | Min 32 chars; rotating invalidates sessions |
| `DATA_ENCRYPTION_KEY` | Spring Boot | Base64 of 32 random bytes; rotating requires re-encrypt job |
| `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `HF_API_TOKEN` / `NVIDIA_NIM_API_KEY` | AI service | Rotate at provider console |
| `AI_SERVICE_INTERNAL_TOKEN` | AI service / Spring Boot backend | Shared secret for internal AI routes (`/ai/queue/*`, `/ai/tasks/*/invoke`) |

## TLS overlay

```bash
docker compose \
  -f docker-compose.yml \
  -f deploy/overlays/docker-compose.tls.yml \
  up -d
```

Caddy terminates TLS on `:443` and reverse-proxies to `backend:8080` / `ai-service:8000`. Set `QUILORE_DOMAIN` (default `localhost`).

## Rotation procedure (tested)

```bash
# Dry-run — prints planned changes, writes nothing
bash deploy/scripts/rotate-secrets.sh --dry-run

# Apply — writes a new secrets file outside the repo (default: ~/.quilore/secrets.env)
bash deploy/scripts/rotate-secrets.sh --apply --out ~/.quilore/secrets.env
```

After apply:

1. Load the new file into the deployment environment (systemd `EnvironmentFile`, Docker `--env-file`, or GitHub Environment secrets).
2. Redeploy services (`bash deploy/scripts/apply-env.sh staging|production` or compose restart).
3. For `DATA_ENCRYPTION_KEY` rotation in production, run the re-encrypt maintenance job before discarding the old key (placeholder hook documented in script output).
4. Verify `/api/health` and `/health` over HTTPS.

Contract test (also run in CI):

```bash
bash deploy/tests/test_secret_rotation.sh
```

## Encryption rules for sensitive user data

| Data class | Storage rule |
|---|---|
| Passwords | One-way hash only (never reversible encrypt) |
| Auth tokens / API keys at rest | AES-GCM via `FieldEncryptor` or external secret manager |
| Health notes / injury free text | AES-GCM at rest when persisted |
| Email / display name | Plaintext indexed fields for v1; encrypt if moved to higher sensitivity tier |
