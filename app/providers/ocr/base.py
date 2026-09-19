from abc import ABC, abstractmethod
from typing import Dict, Any
from pydantic import BaseModel


class OCRResult(BaseModel):
    raw_text: str
    confidence: float
    metadata: Dict[str, Any] = {}
    is_low_quality: bool = False


class OCRProvider(ABC):
    @abstractmethod
    def extract_text(self, image_bytes: bytes) -> OCRResult:
        pass
