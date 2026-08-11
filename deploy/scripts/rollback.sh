#!/usr/bin/env bash
# Rollback production channel tags to a previously promoted version.
# With --dry-run, only validates inputs and prints the planned retags.
# With --apply, invokes crane to move :production onto prod-<version>.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: rollback.sh --version <tag> --backend-image <repo> --ai-image <repo> (--dry-run|--apply)

Rolls the :production tags back to prod-<version> for backend and ai-service.
EOF
}

VERSION=""
BACKEND_IMAGE=""
AI_IMAGE=""
MODE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="${2:-}"; shift 2 ;;
    --backend-image) BACKEND_IMAGE="${2:-}"; shift 2 ;;
    --ai-image) AI_IMAGE="${2:-}"; shift 2 ;;
    --dry-run) MODE="dry-run"; shift ;;
    --apply) MODE="apply"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$VERSION" || -z "$BACKEND_IMAGE" || -z "$AI_IMAGE" || -z "$MODE" ]]; then
  echo "error: --version, --backend-image, --ai-image, and --dry-run|--apply are required" >&2
  exit 2
fi

if [[ ! "$VERSION" =~ ^(staging-[a-f0-9]+|v[0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
  echo "error: version must look like staging-<sha> or vMAJOR.MINOR.PATCH (got: $VERSION)" >&2
  exit 2
fi

plan_retag() {
  local repo="$1"
  echo "crane copy ${repo}:prod-${VERSION} ${repo}:production"
}

echo "Rollback plan for version=${VERSION} mode=${MODE}"
plan_retag "$BACKEND_IMAGE"
plan_retag "$AI_IMAGE"

if [[ "$MODE" == "dry-run" ]]; then
  echo "dry-run complete — no registry changes"
  exit 0
fi

if ! command -v crane >/dev/null 2>&1; then
  echo "error: crane is required for --apply" >&2
  exit 1
fi

crane copy "${BACKEND_IMAGE}:prod-${VERSION}" "${BACKEND_IMAGE}:production"
crane copy "${AI_IMAGE}:prod-${VERSION}" "${AI_IMAGE}:production"
echo "rollback applied: production -> prod-${VERSION}"
