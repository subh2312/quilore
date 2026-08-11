#!/usr/bin/env bash
# Promote helper: validates and prints the production pin for a given version.
# Registry retags are performed by GitHub Actions + crane; this script is the
# local/CI contract for pin generation and argument validation.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: promote.sh --version <tag> [--backend-image <ref>] [--ai-image <ref>] [--out <file>]

Generates a production versions pin for environment promotion.
Does not mutate the registry by itself (Actions workflow does that with crane).
EOF
}

VERSION=""
BACKEND_IMAGE="ghcr.io/example/quilore-backend"
AI_IMAGE="ghcr.io/example/quilore-ai-service"
OUT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="${2:-}"; shift 2 ;;
    --backend-image) BACKEND_IMAGE="${2:-}"; shift 2 ;;
    --ai-image) AI_IMAGE="${2:-}"; shift 2 ;;
    --out) OUT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  echo "error: --version is required" >&2
  exit 2
fi

if [[ ! "$VERSION" =~ ^(staging-[a-f0-9]+|v[0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
  echo "error: version must look like staging-<sha> or vMAJOR.MINOR.PATCH (got: $VERSION)" >&2
  exit 2
fi

PIN=$(cat <<EOF
QUILORE_IMAGE_CHANNEL=production
QUILORE_IMAGE_VERSION=${VERSION}
BACKEND_IMAGE=${BACKEND_IMAGE}:prod-${VERSION}
AI_SERVICE_IMAGE=${AI_IMAGE}:prod-${VERSION}
EOF
)

if [[ -n "$OUT" ]]; then
  printf '%s\n' "$PIN" > "$OUT"
else
  printf '%s\n' "$PIN"
fi
