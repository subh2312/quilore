#!/usr/bin/env bash
# Unit tests for ensure-deploy-path.sh (no Pi / SSD required).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="${ROOT}/deploy/scripts/ensure-deploy-path.sh"
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

ENSURE_DEPLOY_PATH_LIB=1
# shellcheck source=deploy/scripts/ensure-deploy-path.sh
source "$SCRIPT"

existing="${TMP}/apps/quilore"
mkdir -p "$existing"
out="$(ensure_deploy_path "$existing")"
assert_contains "$out" "skipping mkdir" "existing writable path skips mkdir"

fresh="${TMP}/new-root/quilore"
out="$(ensure_deploy_path "$fresh")"
assert_contains "$out" "Created" "missing path is created"
[[ -d "$fresh" ]] || { echo "FAIL: directory not created"; fail=1; }

blocker="${TMP}/not-a-dir"
echo file > "$blocker"
set +e
err="$(ensure_deploy_path "$blocker" 2>&1)"
code=$?
set -e
assert_eq "1" "$code" "non-directory target exits 1"
assert_contains "$err" "not a directory" "non-directory error message"
assert_contains "$err" "disk diagnostics" "prints diagnostics on failure"

chmod +x "$SCRIPT"
bash -n "$SCRIPT"
echo "PASS: bash -n ensure-deploy-path.sh"

if [[ "$fail" -ne 0 ]]; then
  echo "Some ensure-deploy-path tests failed."
  exit 1
fi
echo "All ensure-deploy-path tests passed."
