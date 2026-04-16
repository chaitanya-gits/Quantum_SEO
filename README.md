# QuAir Search

A modern AI-powered search engine with real-time web indexing, intelligent ranking, and a clean user interface.

## Features

- **AI-Powered Search** - Combines traditional search with AI-generated summaries
- **Real-Time Web Crawling** - Distributed crawler with respect for robots.txt
- **Intelligent Ranking** - BM25, PageRank, freshness scoring, and domain authority boosting
- **Multi-Account Support** - User authentication with search history per account
- **Trending Topics** - Live trending searches from Google Trends
- **Multi-Language** - Full UI translation support
- **Modern UI** - Responsive design with dark mode support

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.12, FastAPI, Uvicorn |
| Search Index | OpenSearch |
| Database | PostgreSQL with pgvector |
| Cache | Redis |
| Frontend | Vanilla JS, CSS |
| Infrastructure | Docker, Kubernetes |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/quantum-seo.git
cd quantum-seo
```

2. Copy environment template:
```bash
cp .env.example .env
```

3. Start services:
```bash
cd infra/docker
docker-compose -p quantum_seo up -d
```

4. Access the application at `http://localhost:3000`

### HTTPS Setup (Optional)

Generate SSL certificates for local development:
```bash
mkdir -p infra/certs
docker run --rm -v "$(pwd)/infra/certs:/certs" alpine/openssl req -x509 -newkey rsa:2048 \
  -keyout /certs/key.pem -out /certs/cert.pem -days 365 -nodes \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

## Project Structure

```
├── backend/
│   ├── api/          # REST endpoints
│   ├── crawler/      # Web crawler components
│   ├── indexer/      # Search indexing pipeline
│   ├── ranking/      # Scoring algorithms
│   ├── search/       # Search engine core
│   └── storage/      # Database clients
├── frontend/
│   └── assets/       # Static files (JS, CSS)
├── infra/
│   ├── docker/       # Docker configuration
│   └── k8s/          # Kubernetes manifests
├── scripts/          # Utility scripts
└── tests/            # Test suites
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/search` | Execute search query |
| `GET /api/suggest` | Autocomplete suggestions |
| `GET /api/trending` | Trending search topics |
| `GET /api/health` | Service health check |
| `POST /api/auth/login` | User authentication |

## Configuration

Environment variables (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `OPENSEARCH_URL` | OpenSearch endpoint |
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `TAVILY_API_KEY` | Tavily API key for web search |

## Development

Run tests:
```bash
pytest tests/
```

Watch backend logs:
```bash
docker logs -f quantum-seo-backend
```

## License

MIT
