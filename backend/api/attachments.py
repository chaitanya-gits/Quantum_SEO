from __future__ import annotations

import base64
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import google.generativeai as genai

from backend.config import settings

router = APIRouter()

# Configure generative AI with the API key from settings
genai.configure(api_key=settings.gemini_api_key)


class AttachmentPayload(BaseModel):
    name: str
    mime_type: str
    content_base64: str

class AnalyzeRequest(BaseModel):
    files: list[AttachmentPayload]


@router.post("/attachments/analyze")
async def analyze_attachments(payload: AnalyzeRequest) -> dict:
    if not payload.files:
        raise HTTPException(status_code=400, detail="No files provided")

    try:
        model = genai.GenerativeModel(settings.gemini_model)
        contents = []

        # Construct the parts for the prompt
        for file in payload.files:
            try:
                # Add inline data for Gemini model
                contents.append({
                    "mime_type": file.mime_type,
                    "data": file.content_base64
                })
            except Exception as e:
                print(f"Error decoding base64 for file {file.name}: {e}")
                raise HTTPException(status_code=400, detail=f"Invalid base64 payload for {file.name}")

        text_prompt = (
            "Analyze the provided attachments. "
            "Please provide a concise description of what they contain. "
            "Then, suggest a 2-10 word search query that could be used to find more information related to the contents. "
            "Return the output in purely JSON format using this exact schema: "
            '{"summary": "your description here", "search_query": "your short query here"}'
        )
        contents.append(text_prompt)

        response = await model.generate_content_async(
            contents=contents,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        # Parse output assumption is that response text is valid JSON due to response_mime_type
        import json
        result = json.loads(response.text)
        
        return {
            "search_query": result.get("search_query", f"Information about {payload.files[0].name}"),
            "summary": result.get("summary", "Analysis complete.")
        }
    except Exception as e:
        print(f"Attachment analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Attachment analysis unavailable.")
