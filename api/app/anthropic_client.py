import json
import re

import httpx

from app.config import settings

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


def has_key() -> bool:
    return bool(settings.anthropic_api_key)


async def complete(prompt: str, max_tokens: int = 1000) -> str:
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            ANTHROPIC_URL,
            headers={
                "content-type": "application/json",
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": settings.anthropic_model,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
    if res.status_code >= 400:
        raise RuntimeError(f"anthropic {res.status_code}: {res.text[:200]}")

    data = res.json()
    parts = [b["text"] for b in data.get("content", []) if b.get("type") == "text"]
    return "\n".join(parts).strip()


def parse_json(text: str) -> dict:
    clean = re.sub(r"```json|```", "", text).strip()
    return json.loads(clean)
