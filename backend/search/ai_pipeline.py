from __future__ import annotations

import base64
import html
import io
import json
import re
from typing import Any

import httpx

from backend.config import settings

_CACHE_TTL_SECONDS = 900
_MARKDOWN_HEADING_RE = re.compile(r"^\s{0,3}#{1,6}\s*", re.MULTILINE)
_WHITESPACE_RE = re.compile(r"\s+")
_WIKI_NOISE_RE = re.compile(
    r"(Jump to content|From Wikipedia, the free encyclopedia|This article.*?verification\.)",
    re.IGNORECASE,
)


def clean_snippet(text: str) -> str:
    cleaned = html.unescape(text or "")
    cleaned = _MARKDOWN_HEADING_RE.sub("", cleaned)
    cleaned = cleaned.replace("##", " ")
    cleaned = _WIKI_NOISE_RE.sub(" ", cleaned)
    cleaned = _WHITESPACE_RE.sub(" ", cleaned).strip()
    return cleaned


async def search_web(query: str, redis_storage, limit: int = 10) -> list[dict[str, Any]]:
    if not settings.tavily_api_key:
        return []

    cache_key = f"cache:websearch:{query.strip().lower()}:{limit}"
    cached = await redis_storage.get_json(cache_key)
    if isinstance(cached, list):
        return cached

    payload = {
        "api_key": settings.tavily_api_key,
        "query": query,
        "search_depth": "advanced",
        "max_results": limit,
        "include_answer": False,
        "include_raw_content": False,
    }

    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.post(settings.tavily_api_url, json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError:
        return []

    results = []
    for item in data.get("results", [])[:limit]:
        url = str(item.get("url", "")).strip()
        if not url:
            continue

        results.append(
            {
                "url": url,
                "title": clean_snippet(str(item.get("title", ""))) or "Untitled source",
                "summary": clean_snippet(str(item.get("content", ""))) or "insufficient data",
                "body": clean_snippet(str(item.get("content", ""))),
                "score": float(item.get("score", 1.0) or 1.0),
                "source": "web",
            }
        )

    await redis_storage.set_json(cache_key, results, ttl_seconds=_CACHE_TTL_SECONDS)
    return results


async def generate_ai_answer(
    *,
    query: str,
    sources: list[dict[str, Any]],
    redis_storage,
    attachment_context: str = "",
) -> str:
    cleaned_query = query.strip()
    if not cleaned_query:
        return "insufficient data"

    cleaned_sources = [
        {
            "title": clean_snippet(str(source.get("title", "")))[:180],
            "url": str(source.get("url", "")).strip(),
            "summary": clean_snippet(str(source.get("summary", source.get("body", ""))))[:700],
        }
        for source in sources[:10]
        if str(source.get("url", "")).strip()
    ]

    if not cleaned_sources:
        return "insufficient data"

    cache_key = f"cache:aianswer:{cleaned_query.lower()}:{hash(tuple(item['url'] for item in cleaned_sources))}"
    cached = await redis_storage.get_json(cache_key)
    if isinstance(cached, dict) and isinstance(cached.get("answer"), str):
        return cached["answer"]

    if not settings.openai_api_key:
        return _build_extractive_answer(cleaned_sources)

    source_block = "\n\n".join(
        f"Source {index + 1}:\nTitle: {item['title']}\nURL: {item['url']}\nSummary: {item['summary']}"
        for index, item in enumerate(cleaned_sources)
    )

    attachment_block = f"\nUser uploaded context: {attachment_context}\n" if attachment_context.strip() else ""

    system_prompt = (
        "You are a precise search answer generator. Produce a concise factual answer grounded only in the provided sources. "
        "Do not use markdown headings or hash symbols. Avoid filler. If the sources are weak, say so briefly."
    )
    user_prompt = (
        f"Query: {cleaned_query}\n"
        f"Use the top 10 sources below to answer accurately in 4 to 7 short sentences.{attachment_block}\n"
        f"Sources:\n{source_block}"
    )

    try:
        async with httpx.AsyncClient(timeout=18) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openai_model,
                    "temperature": 0.2,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError:
        return _build_extractive_answer(cleaned_sources)

    answer = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )
    cleaned_answer = clean_snippet(answer) or _build_extractive_answer(cleaned_sources)
    await redis_storage.set_json(cache_key, {"answer": cleaned_answer}, ttl_seconds=_CACHE_TTL_SECONDS)
    return cleaned_answer


async def analyze_attachment_content(
    *,
    file_name: str,
    mime_type: str,
    content_base64: str,
) -> dict[str, str]:
    raw_bytes = base64.b64decode(content_base64)
    extracted_text = _extract_file_text(file_name, mime_type, raw_bytes)

    if mime_type.startswith("image/"):
        return await _analyze_image(file_name=file_name, mime_type=mime_type, content_base64=content_base64)

    if settings.openai_api_key and extracted_text:
        analysis = await _analyze_text_block(file_name=file_name, text=extracted_text)
        if analysis:
            return analysis

    summary = clean_snippet(extracted_text)[:500] if extracted_text else file_name
    return {
        "summary": summary or file_name,
        "search_query": _heuristic_query(summary or file_name),
    }


async def _analyze_text_block(*, file_name: str, text: str) -> dict[str, str] | None:
    truncated_text = clean_snippet(text)[:6000]
    if not truncated_text:
        return None

    prompt = (
        "Return JSON with keys summary and search_query. "
        "Identify what the uploaded file is about and produce a web-search-friendly query."
    )

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openai_model,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": prompt},
                        {
                            "role": "user",
                            "content": f"File name: {file_name}\nContent:\n{truncated_text}",
                        },
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
            parsed = json.loads(content)
    except (httpx.HTTPError, json.JSONDecodeError, KeyError, TypeError, ValueError):
        return None

    summary = clean_snippet(str(parsed.get("summary", "")))
    search_query = clean_snippet(str(parsed.get("search_query", "")))
    if not search_query:
        return None

    return {
        "summary": summary or search_query,
        "search_query": search_query,
    }


async def _analyze_image(*, file_name: str, mime_type: str, content_base64: str) -> dict[str, str]:
    if not settings.openai_api_key:
        fallback = clean_snippet(file_name)
        return {
            "summary": fallback,
            "search_query": _heuristic_query(fallback),
        }

    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openai_model,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Return JSON with keys summary and search_query. Identify what this image is about and create a strong search query for web search.",
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime_type};base64,{content_base64}"
                                    },
                                },
                            ],
                        }
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
            parsed = json.loads(content)
    except (httpx.HTTPError, json.JSONDecodeError, KeyError, TypeError, ValueError):
        fallback = clean_snippet(file_name)
        return {
            "summary": fallback,
            "search_query": _heuristic_query(fallback),
        }

    summary = clean_snippet(str(parsed.get("summary", "")))
    search_query = clean_snippet(str(parsed.get("search_query", "")))
    return {
        "summary": summary or file_name,
        "search_query": search_query or _heuristic_query(file_name),
    }


def _extract_file_text(file_name: str, mime_type: str, raw_bytes: bytes) -> str:
    lowered_name = file_name.lower()

    if mime_type.startswith("text/") or lowered_name.endswith((".txt", ".md", ".csv", ".json", ".py", ".js", ".html", ".css")):
        try:
            return raw_bytes.decode("utf-8", errors="ignore")
        except Exception:
            return ""

    if lowered_name.endswith(".pdf"):
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(raw_bytes))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return ""

    if lowered_name.endswith(".docx"):
        try:
            from docx import Document

            document = Document(io.BytesIO(raw_bytes))
            return "\n".join(paragraph.text for paragraph in document.paragraphs)
        except Exception:
            return ""

    return ""


def _heuristic_query(text: str) -> str:
    cleaned = clean_snippet(text)
    if not cleaned:
        return "uploaded document topic"

    words = [word for word in re.findall(r"[A-Za-z0-9][A-Za-z0-9+\-./]{1,}", cleaned) if len(word) > 2]
    return " ".join(words[:10]) or cleaned[:80]


def _build_extractive_answer(sources: list[dict[str, Any]]) -> str:
    fragments = [item["summary"] for item in sources if item.get("summary") and item["summary"] != "insufficient data"]
    if not fragments:
        return "insufficient data"
    return clean_snippet(" ".join(fragments[:4]))[:900]
