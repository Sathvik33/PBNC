from typing import Optional
from app.providers.ocr.base import OCRProvider, OCRResult
from app.providers.ocr.factory import get_ocr_provider
from app.core.logging import logger


class OCRService:
    def __init__(self, provider: Optional[OCRProvider] = None):
        self.provider = provider or get_ocr_provider()

    def process_image(self, image_bytes: bytes) -> OCRResult:
        result = self.provider.extract_text(image_bytes)
        if result.is_low_quality:
            logger.warning("Low quality OCR detected.")
        return result
