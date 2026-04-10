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

    return TranslateResponse(translations=texts)
