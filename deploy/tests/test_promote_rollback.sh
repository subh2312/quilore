#!/usr/bin/env bash
# Unit tests for promote/rollback scripts (no registry access required).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROMOTE="${ROOT}/deploy/scripts/promote.sh"
ROLLBACK="${ROOT}/deploy/scripts/rollback.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fail=0

assert_eq() {
  local expected="$1" actual="$2" label="$3"
  if [[ "$expected" != "$actual" ]]; then
    echo "FAIL: $label"
    echo "  expected: $expected"
    echo "  actual:   $actual"
    fail=1
  else
    echo "PASS: $label"
  fi
}

assert_contains() {
  local haystack="$1" needle="$2" label="$3"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "FAIL: $label (missing '$needle')"
    echo "  in: $haystack"
    fail=1
  else
    echo "PASS: $label"
  fi
}

assert_exit() {
  local expected="$1"
  shift
  set +e
  "$@" >/dev/null 2>&1
  local code=$?
  set -e
  assert_eq "$expected" "$code" "exit code for: $*"
}

chmod +x "$PROMOTE" "$ROLLBACK" \
  "${ROOT}/deploy/scripts/apply-env.sh"

# --- promote.sh ---
out="$("$PROMOTE" --version staging-deadbeef \
  --backend-image ghcr.io/acme/quilore-backend \
  --ai-image ghcr.io/acme/quilore-ai-service)"
assert_contains "$out" "QUILORE_IMAGE_CHANNEL=production" "promote sets production channel"
assert_contains "$out" "BACKEND_IMAGE=ghcr.io/acme/quilore-backend:prod-staging-deadbeef" "promote pins backend"
assert_contains "$out" "AI_SERVICE_IMAGE=ghcr.io/acme/quilore-ai-service:prod-staging-deadbeef" "promote pins ai"

"$PROMOTE" --version v1.2.3 \
  --backend-image ghcr.io/acme/quilore-backend \
  --ai-image ghcr.io/acme/quilore-ai-service \
  --out "${TMP}/pin.env"
assert_contains "$(cat "${TMP}/pin.env")" "QUILORE_IMAGE_VERSION=v1.2.3" "promote writes out file"

assert_exit 2 "$PROMOTE"
assert_exit 2 "$PROMOTE" --version not-a-version \
  --backend-image x --ai-image y

# --- rollback.sh ---
dry="$("$ROLLBACK" --version staging-abc123 \
  --backend-image ghcr.io/acme/quilore-backend \
  --ai-image ghcr.io/acme/quilore-ai-service \
  --dry-run)"
assert_contains "$dry" "crane copy ghcr.io/acme/quilore-backend:prod-staging-abc123 ghcr.io/acme/quilore-backend:production" \
  "rollback dry-run plans backend retag"
assert_contains "$dry" "crane copy ghcr.io/acme/quilore-ai-service:prod-staging-abc123 ghcr.io/acme/quilore-ai-service:production" \
  "rollback dry-run plans ai retag"
assert_contains "$dry" "dry-run complete" "rollback dry-run completes"

assert_exit 2 "$ROLLBACK" --version staging-abc --backend-image x --ai-image y
assert_exit 2 "$ROLLBACK" --version bad --backend-image x --ai-image y --dry-run

# Overlay files exist and are non-empty
[[ -s "${ROOT}/deploy/overlays/docker-compose.staging.yml" ]]
[[ -s "${ROOT}/deploy/overlays/docker-compose.prod.yml" ]]
echo "PASS: overlays present"

# Workflow files exist
for wf in ci.yml publish-images.yml promote.yml rollback.yml; do
  [[ -s "${ROOT}/.github/workflows/${wf}" ]]
  echo "PASS: workflow ${wf} present"
done

if [[ "$fail" -ne 0 ]]; then
  echo "deploy tooling tests FAILED"
  exit 1
fi

echo "deploy tooling tests PASSED"
