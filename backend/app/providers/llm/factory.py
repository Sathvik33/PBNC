from typing import Optional
from app.core.config import settings
from app.core.logging import logger
from app.providers.llm.base import LLMProvider, LLMResponse
from app.providers.llm.ollama_provider import OllamaProvider
from app.providers.llm.cloud_providers import GroqProvider, OpenRouterProvider


class ResilientLLMProvider(LLMProvider):
    def __init__(self):
        # Auto-prioritize Groq or OpenRouter if keys are configured
        if settings.GROQ_API_KEY:
            self.primary_name = "groq"
        elif settings.OPENROUTER_API_KEY:
            self.primary_name = "openrouter"
        else:
            self.primary_name = settings.LLM_PROVIDER.lower()

        self.ollama = OllamaProvider()
        self.groq = GroqProvider() if settings.GROQ_API_KEY else None
        self.openrouter = OpenRouterProvider() if settings.OPENROUTER_API_KEY else None

    def generate(self, prompt: str, system_prompt: Optional[str] = None, json_mode: bool = True) -> LLMResponse:
        # 1. Primary provider attempt
        try:
            if self.primary_name == "groq" and self.groq:
                logger.info(f"Calling Groq with model {self.groq.model}...")
                return self.groq.generate(prompt, system_prompt, json_mode)
            elif self.primary_name == "openrouter" and self.openrouter:
                logger.info(f"Calling OpenRouter with model {self.openrouter.model}...")
                return self.openrouter.generate(prompt, system_prompt, json_mode)
            elif self.primary_name == "ollama":
                return self.ollama.generate(prompt, system_prompt, json_mode)
        except Exception as e:
            logger.warning(f"Primary LLM provider ({self.primary_name}) failed: {e}. Attempting fallback...")

        # 2. Fallback to Groq
        if self.groq and self.primary_name != "groq":
            try:
                logger.info("Falling back to Groq...")
                return self.groq.generate(prompt, system_prompt, json_mode)
            except Exception as e:
                logger.warning(f"Groq fallback failed: {e}")

        # 3. Fallback to OpenRouter
        if self.openrouter and self.primary_name != "openrouter":
            try:
                logger.info("Falling back to OpenRouter...")
                return self.openrouter.generate(prompt, system_prompt, json_mode)
            except Exception as e:
                logger.warning(f"OpenRouter fallback failed: {e}")

        raise RuntimeError("All configured LLM providers failed or unavailable")


def get_llm_provider() -> LLMProvider:
    return ResilientLLMProvider()
