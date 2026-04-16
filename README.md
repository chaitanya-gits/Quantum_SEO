# QuAir Search

QuAir Search is a full-stack search experience that combines live web results with an AI overview, plus a fast, modern UI.

## What’s included

- FastAPI backend (search, suggestions, trending, auth, attachments, translation)
- OpenSearch indexing + ranking (BM25/freshness/authority boosts)
- PostgreSQL + Redis for storage/caching
- Static frontend (vanilla JS/CSS) served by the backend
- Docker Compose + Kubernetes manifests

## Run locally (Docker)

```powershell
cd G:\Quantum_SEO\infra\docker
docker-compose -p quantum_seo up -d
Start-Process "http://localhost:3000"
```

Stop:

```powershell
cd G:\Quantum_SEO\infra\docker
docker-compose -p quantum_seo down
```

## Deploying frontend to Cloudflare Pages

This repo is **not** a Node app, but Cloudflare Pages can still host the static frontend.

- **Build command**: `npm run build`
- **Output directory**: `dist`

The build script copies `frontend/` into `dist/`.

