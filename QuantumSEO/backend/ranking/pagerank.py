from __future__ import annotations

import math


def apply_pagerank_boost(
    results: list[dict],
    pagerank_scores: dict[str, float],
    weight: float = 0.15,
) -> list[dict]:
    boosted_results: list[dict] = []

    for result in results:
        pagerank_score = float(pagerank_scores.get(result["url"], 0.0))
        boosted_results.append(
            {
                **result,
                "pagerank_score": pagerank_score,
                "score": float(result.get("score", 0.0)) + weight * math.log1p(pagerank_score),
            }
        )

    return boosted_results
