from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class LLMResponse(BaseModel):
    content: str
    raw_response: Optional[Dict[str, Any]] = None
    model_name: str
    provider_name: str


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, system_prompt: Optional[str] = None, json_mode: bool = True) -> LLMResponse:
        pass
