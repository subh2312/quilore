#!/usr/bin/env bash
# Ensure DEPLOY_PATH exists and is writable on the Pi.
# Skips mkdir when the checkout already exists (avoids touching a dead SSD mount
# just to no-op). On failure, prints mount/df/dmesg so GH Actions can show
# Input/output errors instead of a bare mkdir exit.
set -euo pipefail

ensure_deploy_path() {
  local dest="${1:?DEPLOY_PATH required}"
  echo "Deploy path: ${dest}"

  if [[ -d "$dest" && -w "$dest" ]]; then
    echo "Checkout exists and is writable — skipping mkdir."
    return 0
  fi

  if [[ -e "$dest" && ! -d "$dest" ]]; then
    echo "error: ${dest} exists but is not a directory" >&2
    _deploy_path_diagnostics "$dest"
    return 1
  fi

  if mkdir -p "$dest"; then
    echo "Created ${dest}"
    return 0
  fi

  echo "error: cannot create ${dest}" >&2
  _deploy_path_diagnostics "$dest"
  return 1
}

_deploy_path_diagnostics() {
  local dest="$1"
  local parent
  parent="$(dirname "$dest")"
  echo "---- disk diagnostics ----" >&2
  echo "uname: $(uname -a)" >&2
  mount | grep -E '/mnt|ssd' >&2 || mount >&2 || true
  df -h "$parent" "$dest" /mnt/ssd 2>&1 | head -20 >&2 || true
  if command -v dmesg >/dev/null 2>&1; then
    dmesg -T 2>/dev/null | tail -25 >&2 || dmesg | tail -25 >&2 || true
  fi
  echo "Pi SSD/mount at $(dirname "$dest") is not writable (often Input/output error)." >&2
  echo "Remount or repair that disk on the Pi, then re-run Publish — Versioned Container Images." >&2
  echo "Docker data-root is also under /mnt/ssd — compose pull/up cannot succeed until the mount is healthy." >&2
}

if [[ "${ENSURE_DEPLOY_PATH_LIB:-}" != "1" ]]; then
  ensure_deploy_path "${1:-${DEPLOY_PATH:?set DEPLOY_PATH or pass the path}}"
fi
