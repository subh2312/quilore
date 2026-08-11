#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="${ROOT}/deploy/scripts/rotate-secrets.sh"
chmod +x "$SCRIPT"

fail=0
assert_eq() {
  local e="$1" a="$2" l="$3"
  if [[ "$e" != "$a" ]]; then
    echo "FAIL: $l (expected=$e actual=$a)"; fail=1
  else
    echo "PASS: $l"
  fi
}

assert_contains() {
  local hay="$1" needle="$2" l="$3"
  if [[ "$hay" != *"$needle"* ]]; then
    echo "FAIL: $l"; fail=1
  else
    echo "PASS: $l"
  fi
}

out="$("$SCRIPT" --dry-run)"
assert_contains "$out" "dry-run complete" "dry-run completes"
assert_contains "$out" "JWT_SECRET length=" "dry-run reports jwt metadata"
assert_contains "$out" "DATA_ENCRYPTION_KEY length=" "dry-run reports data key metadata"
# Ensure raw secret material is not echoed as assignment lines in dry-run
if echo "$out" | grep -q '^JWT_SECRET='; then
  echo "FAIL: dry-run leaked JWT_SECRET value"; fail=1
else
  echo "PASS: dry-run does not leak JWT_SECRET"
fi

# Refuse writing into the workspace
set +e
"$SCRIPT" --apply --out "${ROOT}/.env.rotated" >/dev/null 2>&1
code=$?
set -e
assert_eq "2" "$code" "refuses to write secrets into the workspace"

# Apply to a temp path outside workspace
TMP_OUT="$(mktemp -p /tmp quilore-secrets.XXXXXX)"
rm -f "$TMP_OUT"
"$SCRIPT" --apply --out "$TMP_OUT" >/dev/null
[[ -f "$TMP_OUT" ]]
perms="$(stat -c '%a' "$TMP_OUT")"
assert_eq "600" "$perms" "secrets file mode is 600"
assert_contains "$(cat "$TMP_OUT")" "JWT_SECRET=" "apply writes jwt"
assert_contains "$(cat "$TMP_OUT")" "DATA_ENCRYPTION_KEY=" "apply writes data key"
rm -f "$TMP_OUT"

# TLS overlay exists
[[ -s "${ROOT}/deploy/overlays/docker-compose.tls.yml" ]]
echo "PASS: TLS overlay present"
[[ -s "${ROOT}/deploy/secrets/README.md" ]]
echo "PASS: secrets README present"

if [[ "$fail" -ne 0 ]]; then
  echo "secret rotation tests FAILED"
  exit 1
fi
echo "secret rotation tests PASSED"
