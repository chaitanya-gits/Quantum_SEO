from __future__ import annotations

from fastapi import APIRouter, Query, Request

from backend.config import settings


router = APIRouter()


@router.get("/suggest")
async def suggest(request: Request, q: str = Query("", alias="q")) -> dict:
    query = q.strip()
    suggestions = await request.app.state.redis.get_suggestions(
        query,
        settings.suggestion_limit,
    )
    return {
        "query": query,
        "suggestions": suggestions,
    }
