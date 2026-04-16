from __future__ import annotations

import math
from urllib.parse import urlparse

_DOMAIN_AUTHORITY: dict[str, float] = {
    "wikipedia.org": 10.0,
    "en.wikipedia.org": 10.0,
    "wikimedia.org": 8.0,
    "britannica.com": 8.5,
    "bbc.com": 8.0,
    "bbc.co.uk": 8.0,
    "reuters.com": 8.0,
    "apnews.com": 7.8,
    "nytimes.com": 7.5,
    "theguardian.com": 7.5,
    "nature.com": 9.0,
    "sciencedirect.com": 8.5,
    "nih.gov": 9.0,
    "pubmed.ncbi.nlm.nih.gov": 9.0,
    "ncbi.nlm.nih.gov": 9.0,
    "gov.uk": 7.5,
    "whitehouse.gov": 7.5,
    "nasa.gov": 8.5,
    "github.com": 7.0,
    "stackoverflow.com": 7.5,
    "developer.mozilla.org": 8.0,
    "docs.python.org": 7.5,
    "microsoft.com": 7.0,
    "learn.microsoft.com": 7.5,
    "developer.apple.com": 7.0,
    "cloud.google.com": 7.0,
    "aws.amazon.com": 7.0,
    "arxiv.org": 8.0,
    "scholar.google.com": 8.0,
    "imdb.com": 6.5,
    "linkedin.com": 6.0,
    "medium.com": 5.0,
    "forbes.com": 6.5,
    "washingtonpost.com": 7.0,
    "cnn.com": 7.0,
    "aljazeera.com": 7.0,
}


def _get_domain_authority(url: str) -> float:
    try:
        hostname = urlparse(url).hostname or ""
    except Exception:
        return 0.0

    hostname = hostname.lower().removeprefix("www.")

    if hostname in _DOMAIN_AUTHORITY:
        return _DOMAIN_AUTHORITY[hostname]

    for domain, score in _DOMAIN_AUTHORITY.items():
        if hostname.endswith("." + domain):
            return score

    return 0.0


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


def apply_authority_boost(
    results: list[dict],
    weight: float = 0.12,
) -> list[dict]:
    boosted: list[dict] = []

    for result in results:
        url = str(result.get("url", ""))
        authority = _get_domain_authority(url)
        new_score = float(result.get("score", 0.0)) + weight * authority
        boosted.append({**result, "authority_score": authority, "score": new_score})

    return boosted
