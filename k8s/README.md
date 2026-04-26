# Kubernetes Deployment

Reference manifests for deploying the platform to a Kubernetes cluster (kind, k3s, or any managed cluster). Apply with:

```bash
kubectl create namespace ecom
kubectl -n ecom create secret generic ecom-secrets \
    --from-literal=JWT_SECRET=$(openssl rand -base64 64) \
    --from-literal=DB_PASSWORD=postgres \
    --from-literal=AI_API_KEY=... \
    --from-literal=CHATBOT_API_KEY=$(openssl rand -hex 32) \
    --from-literal=STRIPE_SECRET_KEY=...
kubectl -n ecom apply -f .
```

## Files

| Manifest | Purpose |
|---|---|
| `postgres.yaml` | StatefulSet + headless Service for the primary DB |
| `backend.yaml` | Deployment + Service for Spring Boot |
| `chatbot.yaml` | Deployment + Service for the FastAPI chatbot |
| `frontend.yaml` | Deployment + Service for the Angular/Nginx bundle |
| `ingress.yaml` | Ingress that routes `/api/*` → backend, `/chat/*` → chatbot, `/` → frontend |
