from __future__ import annotations

from typing import List

from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.search.ai_pipeline import analyze_attachment_content, clean_snippet

router = APIRouter(prefix="/attachments", tags=["attachments"])


class AttachmentPayload(BaseModel):
    name: str = Field(default="")
    mime_type: str = Field(default="application/octet-stream")
    content_base64: str = Field(default="")


class AttachmentAnalyzeRequest(BaseModel):
    files: List[AttachmentPayload] = Field(default_factory=list)


@router.post("/analyze")
async def analyze_attachments(request: AttachmentAnalyzeRequest) -> dict:
    analyses = []

    for item in request.files[:3]:
        if not item.content_base64:
            continue
        analysis = await analyze_attachment_content(
            file_name=item.name,
            mime_type=item.mime_type,
            content_base64=item.content_base64,
        )
        analyses.append(
            {
                "name": item.name,
                "summary": clean_snippet(analysis.get("summary", "")),
                "search_query": clean_snippet(analysis.get("search_query", "")),
            }
        )

    combined_query = " ".join(
        analysis["search_query"] for analysis in analyses if analysis.get("search_query")
    ).strip()
    combined_summary = " ".join(
        analysis["summary"] for analysis in analyses if analysis.get("summary")
    ).strip()

    return {
        "files": analyses,
        "summary": combined_summary,
        "search_query": combined_query,
    }
