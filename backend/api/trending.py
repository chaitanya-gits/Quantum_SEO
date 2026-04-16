from __future__ import annotations

from fastapi import APIRouter, Request

from backend.config import settings


router = APIRouter()


@router.get("/trending")
async def trending(request: Request) -> dict:
    topics = await request.app.state.redis.get_trending_queries(settings.trending_limit)
    return {"topics": topics}
