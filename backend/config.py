from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(slots=True)
class Settings:
    app_name: str = "Quantum SEO"
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "3000"))
    es_url: str = os.getenv("ES_URL", os.getenv("ELASTICSEARCH_URL", "http://127.0.0.1:9200"))
    database_url: str = os.getenv("DATABASE_URL", "postgresql://quantum:quantum@127.0.0.1:5432/quantum_seo")
    redis_url: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    frontend_dir: str = os.getenv("FRONTEND_DIR", "frontend")
    search_index_name: str = os.getenv("SEARCH_INDEX_NAME", "pages")
    crawl_interval_seconds: int = int(os.getenv("CRAWL_INTERVAL_SECONDS", "60"))
    crawl_user_agent: str = os.getenv("CRAWL_USER_AGENT", "QuantumSEO/2.0")
    crawl_timeout_seconds: float = float(os.getenv("CRAWL_TIMEOUT_SECONDS", "15"))
    request_timeout_seconds: float = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "10"))
    trending_limit: int = int(os.getenv("TRENDING_LIMIT", "10"))
    suggestion_limit: int = int(os.getenv("SUGGESTION_LIMIT", "8"))


settings = Settings()
