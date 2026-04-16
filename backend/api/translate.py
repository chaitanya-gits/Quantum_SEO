from __future__ import annotations

from typing import List

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/translate", tags=["translate"])


class TranslateRequest(BaseModel):
    texts: List[str] = Field(default_factory=list)
    target_language: str = Field(default="en")
    source_language: str = Field(default="auto")


class TranslateResponse(BaseModel):
    translations: List[str]


def _normalize_language(value: str) -> str:
    return (value or "").split("-")[0].lower() or "en"


async def _translate_with_google_fallback(
    texts: List[str],
    source_language: str,
    target_language: str,
) -> List[str] | None:
    translated: List[str] = []

    async with httpx.AsyncClient(timeout=20) as client:
        for text in texts:
            response = await client.get(
                "https://translate.googleapis.com/translate_a/single",
                params={
                    "client": "gtx",
                    "sl": source_language if source_language != "auto" else "auto",
                    "tl": target_language,
                    "dt": "t",
                    "q": text,
                },
            )
            response.raise_for_status()
            data = response.json()

            if not isinstance(data, list) or not data or not isinstance(data[0], list):
                return None

            chunks = []
            for item in data[0]:
                if isinstance(item, list) and item and isinstance(item[0], str):
                    chunks.append(item[0])

            translated.append("".join(chunks) or text)

    return translated


@router.post("", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest) -> TranslateResponse:
    texts = [text for text in request.texts if isinstance(text, str)]

    if not texts:
        return TranslateResponse(translations=[])

    source_language = _normalize_language(request.source_language)
    target_language = _normalize_language(request.target_language)

    if target_language == "en" and source_language == "en":
        return TranslateResponse(translations=texts)

    if source_language == target_language:
        return TranslateResponse(translations=texts)

    payload = {
        "q": texts,
        "source": source_language if source_language != "auto" else "auto",
        "target": target_language,
        "format": "text",
    }

    endpoints = (
        "https://translate.argosopentech.com/translate",
        "https://libretranslate.de/translate",
    )

    for endpoint in endpoints:
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError:
            continue

        if isinstance(data, list):
            translated = [
                item.get("translatedText", original)
                if isinstance(item, dict)
                else original
                for item, original in zip(data, texts)
            ]
            return TranslateResponse(translations=translated)

        if isinstance(data, dict):
            translated_text = data.get("translatedText")

            if isinstance(translated_text, list):
                translated = [str(item) for item in translated_text]
                return TranslateResponse(translations=translated)

            if isinstance(translated_text, str):
                return TranslateResponse(translations=[translated_text])

    try:
        fallback_translations = await _translate_with_google_fallback(
            texts=texts,
            source_language=source_language,
            target_language=target_language,
        )
        if fallback_translations:
            return TranslateResponse(translations=fallback_translations)
    except httpx.HTTPError:
        pass

    return TranslateResponse(translations=texts)
