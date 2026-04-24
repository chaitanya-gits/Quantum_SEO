from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

import asyncpg

from backend.config import settings
from backend.ranking.pagerank import compute_pagerank_scores
from backend.search.semantic import matches_filters


@dataclass(slots=True)
class SearchRecord:
    url: str
    title: str
    body: str
    summary: str
    updated_at: datetime
    score: float


SEARCH_PAGES_SQL = """
SELECT
  url,
  title,
  body,
  summary,
  updated_at,
  ts_rank_cd(search_document, plainto_tsquery('english', $1)) AS score
FROM pages
WHERE search_document @@ plainto_tsquery('english', $1)
ORDER BY score DESC, updated_at DESC
LIMIT $2
"""

LATEST_PAGES_SQL = """
SELECT url, title, body, summary, updated_at, 1.0::float AS score
FROM pages
ORDER BY updated_at DESC
LIMIT $1
"""

PAGERANK_NODES_SQL = "SELECT url FROM pages"

PAGERANK_LINKS_SQL = """
SELECT source_url, target_url
FROM page_links
"""

UPSERT_PAGE_SQL = """
INSERT INTO pages (
  url,
  title,
  body,
  summary,
  last_seed_query,
  outbound_links,
  updated_at,
  search_document
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6::jsonb,
  NOW(),
  to_tsvector('english', $2 || ' ' || $3)
)
ON CONFLICT (url) DO UPDATE
SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  summary = EXCLUDED.summary,
  last_seed_query = EXCLUDED.last_seed_query,
  outbound_links = EXCLUDED.outbound_links,
  updated_at = NOW(),
  search_document = to_tsvector('english', EXCLUDED.title || ' ' || EXCLUDED.body)
"""

DELETE_PAGE_LINKS_SQL = "DELETE FROM page_links WHERE source_url = $1"

INSERT_PAGE_LINK_SQL = """
INSERT INTO page_links (source_url, target_url)
VALUES ($1, $2)
ON CONFLICT (source_url, target_url) DO NOTHING
"""

FETCH_PAGE_DOCUMENTS_SQL = """
SELECT url, title, body, summary, updated_at
FROM pages
ORDER BY updated_at DESC
LIMIT $1
"""


class PostgresStorage:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                self._database_url,
                min_size=settings.postgres_min_pool_size,
                max_size=settings.postgres_max_pool_size,
            )

    async def disconnect(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    @property
    def pool(self) -> asyncpg.Pool:
        if self._pool is None:
            raise RuntimeError("Postgres pool has not been initialized.")
        return self._pool

    async def healthcheck(self) -> bool:
        try:
            await self.pool.fetchval("SELECT 1")
            return True
        except Exception:
            return False

    async def count_pages(self) -> int:
        count = await self.pool.fetchval("SELECT COUNT(*) FROM pages")
        return int(count)

    async def search_pages(
        self,
        query: str,
        limit: int = 10,
        *,
        site: str = "",
        filetype: str = "",
        date_range: str = "",
    ) -> list[SearchRecord]:
        rows = await self.pool.fetch(SEARCH_PAGES_SQL, query, max(limit * 5, limit))
        records = [SearchRecord(**dict(row)) for row in rows]
        filtered_records = [
            row
            for row in records
            if matches_filters(
                url=row.url,
                updated_at=row.updated_at,
                site=site,
                filetype=filetype,
                date_range=date_range,
            )
        ]
        return filtered_records[:limit]

    async def latest_pages(self, limit: int = 10) -> list[SearchRecord]:
        rows = await self.pool.fetch(LATEST_PAGES_SQL, limit)
        return [SearchRecord(**dict(row)) for row in rows]

    async def get_pagerank_scores(self, urls: list[str]) -> dict[str, float]:
        if not urls:
            return {}

        scores = await self.compute_all_pagerank_scores()
        return {url: float(scores.get(url, 0.0)) for url in urls}

    async def compute_all_pagerank_scores(self) -> dict[str, float]:
        """Compute PageRank over the full page graph once (for caching)."""

        node_rows = await self.pool.fetch(PAGERANK_NODES_SQL)
        link_rows = await self.pool.fetch(PAGERANK_LINKS_SQL)
        return compute_pagerank_scores(
            [(str(row["source_url"]), str(row["target_url"])) for row in link_rows],
            nodes=[str(row["url"]) for row in node_rows],
        )

    async def upsert_page(
        self,
        *,
        url: str,
        title: str,
        body: str,
        summary: str,
        outbound_links: list[str],
        last_seed_query: str = "",
    ) -> None:
        async with self.pool.acquire() as connection:
            async with connection.transaction():
                await connection.execute(
                    UPSERT_PAGE_SQL,
                    url,
                    title,
                    body,
                    summary,
                    last_seed_query,
                    outbound_links,
                )
                await connection.execute(DELETE_PAGE_LINKS_SQL, url)

                if outbound_links:
                    link_rows = [(url, target_url) for target_url in outbound_links]
                    await connection.executemany(INSERT_PAGE_LINK_SQL, link_rows)

    async def fetch_page_documents(self, limit: int = 500) -> list[dict[str, Any]]:
        rows = await self.pool.fetch(FETCH_PAGE_DOCUMENTS_SQL, limit)
        return [dict(row) for row in rows]
