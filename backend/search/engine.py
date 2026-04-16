from __future__ import annotations

from dataclasses import dataclass

from backend.indexer.es_client import SearchIndexClient
from backend.ranking.bm25 import rank_with_bm25
from backend.ranking.freshness import apply_freshness_boost
from backend.ranking.fusion import reciprocal_rank_fusion
from backend.ranking.pagerank import apply_authority_boost, apply_pagerank_boost
from backend.search.ai_pipeline import generate_ai_answer, search_web
from backend.search.query_parser import parse_query
from backend.search.result_builder import build_answer, build_sources
from backend.storage.postgres import PostgresStorage
from backend.storage.redis import RedisStorage


@dataclass(slots=True)
class SearchEngine:
    postgres: PostgresStorage
    redis: RedisStorage
    search_index: SearchIndexClient

    async def search(
        self,
        query: str,
        limit: int = 10,
        region: str = "",
        language: str = "",
        safe_search: str = "",
        attachment_context: str = "",
    ) -> dict:
        parsed_query = parse_query(query)
        search_queries = [item for item in parsed_query.search_queries if item]

        if not search_queries:
            return self._build_empty_payload(parsed_query.normalized)

        primary_query = search_queries[0]
        await self.redis.record_query(parsed_query.normalized)

        bm25_results = await rank_with_bm25(self.postgres, primary_query, limit=limit)
        opensearch_results = await self.search_index.text_search(primary_query, limit=limit)
        for result in opensearch_results:
            result["source"] = "opensearch"

        ranked_results = reciprocal_rank_fusion([bm25_results, opensearch_results])
        pagerank_scores = await self.postgres.get_pagerank_scores(
            [result["url"] for result in ranked_results],
        )
        ranked_results = apply_pagerank_boost(ranked_results, pagerank_scores)
        ranked_results = apply_freshness_boost(ranked_results)
        ranked_results.sort(key=lambda item: item["score"], reverse=True)

        web_results = await search_web(primary_query, self.redis, limit=limit)
        web_results = apply_authority_boost(web_results)
        merged_results = self._merge_results(ranked_results, web_results, limit=limit)
        merged_results.sort(key=lambda item: float(item.get("score", 0.0)), reverse=True)
        built_sources = build_sources(merged_results, limit=limit)
        final_answer = await generate_ai_answer(
            query=parsed_query.normalized,
            sources=built_sources,
            redis_storage=self.redis,
            attachment_context=attachment_context,
        )

        return {
            "query": parsed_query.normalized,
            "search_queries": search_queries,
            "sources": built_sources,
            "final_answer": final_answer or build_answer(merged_results),
            "index_status": await self._build_index_status(),
            "search_settings": {
                "region": region,
                "language": language,
                "safe_search": safe_search,
                "attachment_context": attachment_context,
            },
        }

    async def _build_index_status(self) -> dict:
        return {
            "postgres_documents": await self.postgres.count_pages(),
            "redis_connected": await self.redis.healthcheck(),
        }

    @staticmethod
    def _build_empty_payload(normalized_query: str) -> dict:
        return {
            "query": normalized_query,
            "search_queries": [],
            "sources": [],
            "final_answer": "insufficient data",
        }

    @staticmethod
    def _merge_results(local_results: list[dict], web_results: list[dict], limit: int = 10) -> list[dict]:
        deduped: list[dict] = []
        seen_urls: set[str] = set()

        for result in [*web_results, *local_results]:
            url = str(result.get("url", "")).strip()
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            deduped.append(result)
            if len(deduped) >= limit:
                break

        return deduped
