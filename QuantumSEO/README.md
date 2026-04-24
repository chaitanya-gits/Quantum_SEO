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

## Deployment notes

This repository includes both a static frontend and a Python backend. Choose a deployment platform that can run the backend services (FastAPI + OpenSearch + Postgres + Redis).

