from __future__ import annotations

from datetime import UTC, datetime

import httpx

from backend.config import settings
from backend.crawler.extractor import extract_document
from backend.crawler.robots import can_fetch


async def crawl_url(url: str) -> dict | None:
    if not can_fetch(url, settings.crawl_user_agent):
        return None

    response_text = await _fetch_page(url)
    document = extract_document(url, response_text)
    document["updated_at"] = datetime.now(UTC)
    return document


async def _fetch_page(url: str) -> str:
    timeout = httpx.Timeout(settings.crawl_timeout_seconds)

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=timeout,
        headers={"User-Agent": settings.crawl_user_agent},
    ) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.text
