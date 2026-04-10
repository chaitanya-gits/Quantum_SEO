from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter()

EMPTY_SEARCH_PAYLOAD = {
    "query": "",
    "search_queries": [],
    "sources": [],
    "final_answer": "insufficient data",
}

@router.get("/search")
async def search(
    request: Request,
    q: str = Query("", alias="q"),
    region: str = Query("", alias="region"),
    hl: str = Query("", alias="hl"),
    safe_search: str = Query("", alias="safe_search"),
    context: str = Query("", alias="context"),
) -> dict:
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail=EMPTY_SEARCH_PAYLOAD)

    return await request.app.state.search_engine.search(
        query,
        region=region,
        language=hl,
        safe_search=safe_search,
        attachment_context=context,
    )

@router.get("/index/status")
async def index_status(request: Request) -> dict:
    postgres = request.app.state.postgres
    redis = request.app.state.redis
    search_index = request.app.state.search_index

    return {
        "postgres_documents": await postgres.count_pages(),
        "redis_connected": await redis.healthcheck(),
        "opensearch_connected": await search_index.healthcheck(),
    }
