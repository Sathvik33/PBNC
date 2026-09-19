from app.core.config import settings
from app.providers.ocr.base import OCRProvider, OCRResult
from app.providers.ocr.tesseract_provider import TesseractOCRProvider
from app.providers.ocr.vision_ocr_provider import VisionLLMOCRProvider
from app.core.logging import logger


class ResilientOCRProvider(OCRProvider):
    def __init__(self):
        self.tesseract = TesseractOCRProvider()
        self.vision = VisionLLMOCRProvider()

    def extract_text(self, image_bytes: bytes) -> OCRResult:
        # If Groq or OpenRouter vision is available, use it for rich scans & terminal images
        if settings.GROQ_API_KEY or settings.OPENROUTER_API_KEY:
            res = self.vision.extract_text(image_bytes)
            if res.raw_text.strip():
                return res

        # Otherwise try local Tesseract
        try:
            res = self.tesseract.extract_text(image_bytes)
            if res.raw_text.strip():
                return res
        except Exception as e:
            logger.warning(f"Local tesseract OCR failed: {e}")

        # Fallback to vision if tesseract yielded empty text
        return self.vision.extract_text(image_bytes)


def get_ocr_provider() -> OCRProvider:
    return ResilientOCRProvider()
