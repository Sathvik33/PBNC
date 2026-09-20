from typing import Optional
from app.core.config import settings
from app.core.logging import logger
from app.providers.llm.base import LLMProvider, LLMResponse
from app.providers.llm.ollama_provider import OllamaProvider
from app.providers.llm.cloud_providers import GroqProvider, OpenRouterProvider


class ResilientLLMProvider(LLMProvider):
    def __init__(self):
        # Prioritize OpenRouter as the primary LLM model, Groq as optional fallback
        if settings.OPENROUTER_API_KEY:
            self.primary_name = "openrouter"
        elif settings.GROQ_API_KEY:
            self.primary_name = "groq"
        else:
            self.primary_name = settings.LLM_PROVIDER.lower()

        self.ollama = OllamaProvider()
        self.openrouter = OpenRouterProvider() if settings.OPENROUTER_API_KEY else None
        self.groq = GroqProvider() if settings.GROQ_API_KEY else None

    def generate(self, prompt: str, system_prompt: Optional[str] = None, json_mode: bool = True) -> LLMResponse:
        errors = []

        # 1. Primary provider attempt (OpenRouter)
        if self.primary_name == "openrouter" and self.openrouter:
            try:
                logger.info(f"Calling primary provider OpenRouter ({self.openrouter.model})...")
                return self.openrouter.generate(prompt, system_prompt, json_mode)
            except Exception as e:
                err_msg = str(e)
                logger.warning(f"OpenRouter encountered an issue ({err_msg}). Automatically failing over to Groq...")
                errors.append(f"OpenRouter: {err_msg}")

        # 2. Fallback to Groq (on rate limits 429, payment limits 402, or any network failures)
        if self.groq:
            try:
                logger.info(f"Failing over to Groq ({self.groq.model})...")
                return self.groq.generate(prompt, system_prompt, json_mode)
            except Exception as e:
                err_msg = str(e)
                logger.warning(f"Groq fallback failed: {err_msg}")
                errors.append(f"Groq: {err_msg}")

        # 3. Local Ollama fallback if available
        if self.primary_name != "ollama":
            try:
                logger.info("Attempting local Ollama fallback...")
                return self.ollama.generate(prompt, system_prompt, json_mode)
            except Exception as e:
                errors.append(f"Ollama: {e}")

        raise RuntimeError(f"All configured LLM providers failed or rate-limited: {'; '.join(errors)}")


def get_llm_provider() -> LLMProvider:
    return ResilientLLMProvider()
