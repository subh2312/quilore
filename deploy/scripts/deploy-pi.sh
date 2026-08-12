#!/usr/bin/env bash
# Selective Pi UAT deploy: pull/restart only the services that changed.
# Expects to run on the Pi inside the Quilore checkout (DEPLOY_PATH).
#
# Usage:
#   BACKEND_IMAGE=ghcr.io/.../quilore-backend:sha-abc \
#   AI_SERVICE_IMAGE=ghcr.io/.../quilore-ai-service:sha-def \
#   DEPLOY_BACKEND=1 DEPLOY_AI=0 \
#   bash deploy/scripts/deploy-pi.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

DEPLOY_BACKEND="${DEPLOY_BACKEND:-0}"
DEPLOY_AI="${DEPLOY_AI:-0}"
DEPLOY_DEPS="${DEPLOY_DEPS:-1}"

if [[ "$DEPLOY_BACKEND" != "1" && "$DEPLOY_AI" != "1" ]]; then
  echo "Nothing to deploy (DEPLOY_BACKEND=$DEPLOY_BACKEND DEPLOY_AI=$DEPLOY_AI)."
  exit 0
fi

if [[ ! -f .env ]]; then
  echo "error: missing $ROOT_DIR/.env — create from .env.example before first deploy" >&2
  exit 1
fi

COMPOSE=(docker compose
  -f docker-compose.yml
  -f deploy/overlays/docker-compose.staging.yml
  -f deploy/overlays/docker-compose.uat.yml
  -f deploy/overlays/docker-compose.tunnel.yml
)

# Ensure data-plane deps are up (idempotent; does not rebuild app images).
if [[ "$DEPLOY_DEPS" == "1" ]]; then
  echo "Ensuring postgres + minio are up..."
  "${COMPOSE[@]}" up -d --no-build --remove-orphans postgres minio
fi

SERVICES=()
if [[ "$DEPLOY_BACKEND" == "1" ]]; then
  if [[ -z "${BACKEND_IMAGE:-}" ]]; then
    echo "error: BACKEND_IMAGE must be set when DEPLOY_BACKEND=1" >&2
    exit 2
  fi
  export BACKEND_IMAGE
  echo "Deploying backend → ${BACKEND_IMAGE}"
  SERVICES+=(backend)
fi

if [[ "$DEPLOY_AI" == "1" ]]; then
  if [[ -z "${AI_SERVICE_IMAGE:-}" ]]; then
    echo "error: AI_SERVICE_IMAGE must be set when DEPLOY_AI=1" >&2
    exit 2
  fi
  export AI_SERVICE_IMAGE
  echo "Deploying ai-service → ${AI_SERVICE_IMAGE}"
  SERVICES+=(ai-service)
fi

echo "Pulling: ${SERVICES[*]}"
"${COMPOSE[@]}" pull "${SERVICES[@]}"

echo "Recreating: ${SERVICES[*]}"
"${COMPOSE[@]}" up -d --no-build --pull missing --remove-orphans "${SERVICES[@]}"

echo "Waiting for health..."
if [[ "$DEPLOY_BACKEND" == "1" ]]; then
  for i in $(seq 1 60); do
    if curl -fsS -m 3 http://127.0.0.1:8080/api/health >/dev/null 2>&1; then
      echo "backend healthy"
      break
    fi
    if [[ "$i" -eq 60 ]]; then
      echo "error: backend failed health check" >&2
      docker logs quilore-backend 2>&1 | tail -80 || true
      exit 1
    fi
    sleep 5
  done
fi

if [[ "$DEPLOY_AI" == "1" ]]; then
  for i in $(seq 1 36); do
    if curl -fsS -m 3 http://127.0.0.1:8000/health >/dev/null 2>&1; then
      echo "ai-service healthy"
      break
    fi
    if [[ "$i" -eq 36 ]]; then
      echo "error: ai-service failed health check" >&2
      docker logs quilore-ai-service 2>&1 | tail -80 || true
      exit 1
    fi
    sleep 5
  done
fi

"${COMPOSE[@]}" ps
echo "Pi deploy complete."
