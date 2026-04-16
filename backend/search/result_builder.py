from __future__ import annotations

import re


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def summarize_result(result: dict) -> str:
    summary = clean_text(str(result.get("summary", "")))
    if summary:
        return summary[:320]

    body = clean_text(str(result.get("body", "")))
    if body:
        return body[:320]

    return "insufficient data"


def build_answer(results: list[dict]) -> str:
    if not results:
        return "insufficient data"

    parts: list[str] = []
    for result in results[:3]:
        summary = summarize_result(result)
        if summary != "insufficient data":
            parts.append(summary)

    combined = clean_text(" ".join(parts))
    return combined[:650] if combined else "insufficient data"


def build_sources(results: list[dict], limit: int = 10) -> list[dict]:
    sources: list[dict] = []
    for result in results[:limit]:
        url = str(result.get("url", "")).strip()
        if not url:
            continue

        sources.append(
            {
                "title": clean_text(str(result.get("title", ""))) or "Untitled source",
                "url": url,
                "summary": summarize_result(result),
            }
        )

    return sources
