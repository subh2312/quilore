#!/usr/bin/env bash
# B7 smoke checks for VPS + Cloudflare Tunnel loopback model (no Caddy required).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "==> Validate base + tunnel overlay compose"
JWT_SECRET='test-only-jwt-secret-must-be-32chars-xx' \
DATA_ENCRYPTION_KEY='AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=' \
  docker compose -f docker-compose.yml -f deploy/overlays/docker-compose.tunnel.yml config --quiet

echo "==> Confirm loopback port bindings in rendered config"
RENDERED="$(
JWT_SECRET='test-only-jwt-secret-must-be-32chars-xx' \
DATA_ENCRYPTION_KEY='AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=' \
  docker compose -f docker-compose.yml -f deploy/overlays/docker-compose.tunnel.yml config
)"
echo "$RENDERED" | grep -q 'host_ip: 127.0.0.1'
echo "$RENDERED" | grep -q 'published: "8080"'
echo "$RENDERED" | grep -q 'published: "8000"'

echo "==> Confirm Caddy is NOT required by tunnel overlay"
if echo "$RENDERED" | grep -q 'container_name: quilore-caddy'; then
  echo "FAIL: tunnel overlay must not pull in Caddy" >&2
  exit 1
fi

echo "==> Optional TLS/Caddy overlay remains separately documented"
test -f deploy/overlays/docker-compose.tls.yml
test -f deploy/overlays/Caddyfile
grep -q 'deploy/overlays/Caddyfile' deploy/overlays/docker-compose.tls.yml

echo "==> Tunnel example ingress present"
test -f deploy/overlays/cloudflared-config.example.yml
grep -q '127.0.0.1:8080' deploy/overlays/cloudflared-config.example.yml
grep -q '127.0.0.1:8000' deploy/overlays/cloudflared-config.example.yml

echo "B7 compose/tunnel smoke: PASS (config-level). Live cloudflared hostname check requires credentials."
