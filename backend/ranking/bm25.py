from __future__ import annotations

from backend.storage.postgres import PostgresStorage


def _serialize_record(row) -> dict:
    return {
        "url": row.url,
        "title": row.title,
        "body": row.body,
        "summary": row.summary,
        "updated_at": row.updated_at,
        "score": float(row.score),
        "source": "bm25",
    }


async def rank_with_bm25(postgres: PostgresStorage, query: str, limit: int = 10) -> list[dict]:
    rows = await postgres.search_pages(query, limit=limit)
    return [_serialize_record(row) for row in rows]
