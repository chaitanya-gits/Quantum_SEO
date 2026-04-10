from __future__ import annotations

from collections.abc import Iterable
import json

from redis.asyncio import Redis


TRENDING_KEY = "search:trending"
FRONTIER_KEY = "crawl:frontier"


class RedisStorage:
    def __init__(self, redis_url: str) -> None:
        self._redis = Redis.from_url(redis_url, decode_responses=True)

    @property
    def client(self) -> Redis:
        return self._redis

    async def close(self) -> None:
        await self._redis.aclose()

    async def healthcheck(self) -> bool:
        try:
            await self._redis.ping()
            return True
        except Exception:
            return False

    async def record_query(self, query: str) -> None:
        normalized_query = query.strip().lower()
        if normalized_query:
            await self._redis.zincrby(TRENDING_KEY, 1, normalized_query)

    async def get_trending_queries(self, limit: int) -> list[str]:
        end_index = max(limit - 1, 0)
        items = await self._redis.zrevrange(TRENDING_KEY, 0, end_index)
        return [item for item in items if item]

    async def get_suggestions(self, prefix: str, limit: int) -> list[str]:
        normalized_prefix = prefix.strip().lower()
        candidates = await self.get_trending_queries(limit * 4)

        if not normalized_prefix:
            return candidates[:limit]

        matches = [item for item in candidates if item.startswith(normalized_prefix)]
        return matches[:limit]

    async def push_frontier(self, urls: Iterable[str]) -> None:
        cleaned_urls = [url.strip() for url in urls if url and url.strip()]
        if cleaned_urls:
            await self._redis.rpush(FRONTIER_KEY, *cleaned_urls)

    async def pop_frontier(self) -> str | None:
        return await self._redis.lpop(FRONTIER_KEY)

    async def get_json(self, key: str) -> dict | list | None:
        raw_value = await self._redis.get(key)
        if not raw_value:
            return None

        try:
            return json.loads(raw_value)
        except json.JSONDecodeError:
            return None

    async def set_json(self, key: str, value: dict | list, ttl_seconds: int = 900) -> None:
        await self._redis.set(key, json.dumps(value), ex=ttl_seconds)
