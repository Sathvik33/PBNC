import json
from typing import Optional
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.providers.llm.base import LLMProvider, LLMResponse


class OllamaProvider(LLMProvider):
    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL

    def generate(self, prompt: str, system_prompt: Optional[str] = None, json_mode: bool = True) -> LLMResponse:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt
        if json_mode:
            payload["format"] = "json"

        try:
            with httpx.Client(timeout=60.0) as client:
                res = client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                return LLMResponse(
                    content=data.get("response", ""),
                    raw_response=data,
                    model_name=self.model,
                    provider_name="ollama"
                )
        except Exception as e:
            logger.error(f"Ollama request failed: {e}")
            raise e
