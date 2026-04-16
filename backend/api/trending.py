from __future__ import annotations

import xml.etree.ElementTree as ET

import httpx
from fastapi import APIRouter, Request

from backend.config import settings

router = APIRouter()

_GOOGLE_TRENDS_RSS = "https://trends.google.com/trending/rss?geo={geo}&hl=en"
_CACHE_KEY = "quair:trending:live"
_CACHE_TTL = 600  # 10 minutes


def _is_latin_text(text: str) -> bool:
    latin_count = sum(1 for ch in text if ch.isascii() or ch in "àáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿ")
    return latin_count / max(len(text), 1) > 0.7


async def _fetch_google_trends(geo: str = "US") -> list[str]:
    url = _GOOGLE_TRENDS_RSS.format(geo=geo)
    async with httpx.AsyncClient(timeout=12) as client:
        resp = await client.get(url)
        resp.raise_for_status()

    root = ET.fromstring(resp.text)
    titles: list[str] = []
    for item in root.iter("item"):
        title_el = item.find("title")
        if title_el is not None and title_el.text:
            title = title_el.text.strip()
            if _is_latin_text(title):
                titles.append(title)
    return titles


@router.get("/trending")
async def trending(request: Request) -> dict:
    redis = request.app.state.redis
    geo = request.query_params.get("geo", "US").upper()
    cache_key = f"{_CACHE_KEY}:{geo}"

    cached = await redis._redis.get(cache_key)
    if cached:
        import json
        try:
            topics = json.loads(cached)
            if topics:
                return {"topics": topics}
        except Exception:
            pass

    try:
        topics = await _fetch_google_trends(geo)
        if topics:
            import json
            await redis._redis.set(cache_key, json.dumps(topics[:settings.trending_limit]), ex=_CACHE_TTL)
            return {"topics": topics[: settings.trending_limit]}
    except Exception:
        pass

    fallback = await redis.get_trending_queries(settings.trending_limit)
    return {"topics": fallback}
