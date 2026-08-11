#!/usr/bin/env bash
# Apply a pinned image set to the local/VPS docker compose stack for an environment.
set -euo pipefail

ENV_NAME="${1:-}"
if [[ -z "$ENV_NAME" || ( "$ENV_NAME" != "staging" && "$ENV_NAME" != "production" ) ]]; then
  echo "Usage: apply-env.sh <staging|production>" >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OVERLAY="${ROOT_DIR}/deploy/overlays/docker-compose.${ENV_NAME}.yml"

if [[ -z "${BACKEND_IMAGE:-}" || -z "${AI_SERVICE_IMAGE:-}" ]]; then
  echo "error: BACKEND_IMAGE and AI_SERVICE_IMAGE must be set" >&2
  exit 2
fi

if [[ ! -f "$OVERLAY" ]]; then
  echo "error: missing overlay $OVERLAY" >&2
  exit 1
fi

export BACKEND_IMAGE AI_SERVICE_IMAGE
echo "Applying ${ENV_NAME} with:"
echo "  BACKEND_IMAGE=${BACKEND_IMAGE}"
echo "  AI_SERVICE_IMAGE=${AI_SERVICE_IMAGE}"

docker compose \
  -f "${ROOT_DIR}/docker-compose.yml" \
  -f "${OVERLAY}" \
  up -d --no-build --pull always --remove-orphans backend ai-service
