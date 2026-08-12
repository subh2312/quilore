# Quilore Kubernetes UAT (arm64 / Raspberry Pi)

Preferred deploy path: **GitHub Actions builds `linux/arm64` images → GHCR → k3s on the Pi**.
Do **not** clone the monorepo or build on the Pi. Do **not** publish amd64.

Coexists with Hermes (`127.0.0.1:9119`) and Home Assistant. Leave Docker root at `/mnt/ssd/docker`.

## Prerequisites

1. k3s (or compatible) on the Pi — install once (needs sudo):
   ```bash
   curl -sfL https://get.k3s.io | sh -
   sudo k3s kubectl get nodes
   ```
2. GHCR pull access for private packages (imagePullSecret) if the repo/packages are private.
3. Cloudflare Tunnel hostname pointed at the backend Service (cluster or host cloudflared).

## Apply

```bash
# From a machine with kubeconfig for the Pi (or on the Pi itself):
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml   # or your copied kubeconfig

# 1) Namespace + secrets (copy example first)
cp deploy/k8s/uat/secrets.yaml.example /tmp/quilore-secrets.yaml
# edit /tmp/quilore-secrets.yaml — set JWT_SECRET, DATA_ENCRYPTION_KEY, etc.
# Leave NVIDIA_NIM_API_KEY empty until you have one.

kubectl apply -f deploy/k8s/uat/namespace.yaml
kubectl apply -f /tmp/quilore-secrets.yaml
kubectl apply -f deploy/k8s/uat/postgres.yaml
kubectl apply -f deploy/k8s/uat/minio.yaml
kubectl apply -f deploy/k8s/uat/backend.yaml
kubectl apply -f deploy/k8s/uat/ai-service.yaml

# Optional: pin to a specific staging digest/tag after publish-images.yml runs
kubectl -n quilore set image deploy/backend \
  backend=ghcr.io/subh2312/quilore-backend:staging-<sha>
kubectl -n quilore set image deploy/ai-service \
  ai-service=ghcr.io/subh2312/quilore-ai-service:staging-<sha>
```

## Cloudflare

Keep using the host `cloudflared` (already serving Hermes/HA) **or** the in-cluster pattern under `saleboomseo/k8s/cloudflared`.

Ingress target for APK / UAT:

| Hostname | Upstream |
|---|---|
| `quilore.sm4devlabs.dpdns.org` | `http://backend.quilore.svc.cluster.local:8080` (in-cluster CF) **or** NodePort/port-forward to host loopback `127.0.0.1:8080` if you expose via host CF |

Host CF config snippet (when Service is published to host loopback via `kubectl port-forward` or NodePort bound locally):

```yaml
  - hostname: quilore.sm4devlabs.dpdns.org
    service: http://127.0.0.1:8080
```

Apply with sudo to `/etc/cloudflared/config.yml` and `systemctl restart cloudflared`.

## Mock IAP

| Env | Meaning |
|---|---|
| `QUILORE_ALLOW_MOCK_RECEIPTS=true` | Master switch (boolean) |
| `QUILORE_MOCK_RECEIPT_TOKEN=UAT_MOCK_RECEIPT` | Receipt **string** the client sends (not a boolean flag) |

## Images

Published by `.github/workflows/publish-images.yml` as **`linux/arm64` only**.
