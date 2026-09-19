from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pydantic import BaseModel


class VisionAnalysisResult(BaseModel):
    has_image: bool = False
    has_table: bool = False
    has_diagram: bool = False
    description: Optional[str] = None
    confidence: float = 1.0


class VisionProvider(ABC):
    @abstractmethod
    def analyze_image(self, image_bytes: bytes) -> VisionAnalysisResult:
        pass


class DefaultVisionProvider(VisionProvider):
    def analyze_image(self, image_bytes: bytes) -> VisionAnalysisResult:
        # Lightweight heuristic detector
        return VisionAnalysisResult(
            has_image=len(image_bytes) > 50000,
            has_table=False,
            has_diagram=False,
            confidence=0.85
        )
