from __future__ import annotations

from dataclasses import dataclass

from backend.indexer.es_client import SearchIndexClient
from backend.ranking.bm25 import rank_with_bm25
from backend.ranking.freshness import apply_freshness_boost
from backend.ranking.fusion import reciprocal_rank_fusion
from backend.ranking.pagerank import apply_pagerank_boost
from backend.search.query_parser import parse_query
from backend.search.result_builder import build_answer, build_sources
from backend.storage.postgres import PostgresStorage
from backend.storage.redis import RedisStorage


@dataclass(slots=True)
class SearchEngine:
    postgres: PostgresStorage
    redis: RedisStorage
    search_index: SearchIndexClient

    async def search(self, query: str, limit: int = 10) -> dict:
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

        return {
            "query": parsed_query.normalized,
            "search_queries": search_queries,
            "sources": build_sources(ranked_results, limit=limit),
            "final_answer": build_answer(ranked_results),
            "index_status": await self._build_index_status(),
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
