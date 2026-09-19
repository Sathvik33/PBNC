from app.core.config import settings
from app.providers.ocr.base import OCRProvider
from app.providers.ocr.tesseract_provider import TesseractOCRProvider


def get_ocr_provider() -> OCRProvider:
    provider_name = settings.OCR_PROVIDER.lower()
    if provider_name == "tesseract":
        return TesseractOCRProvider()
    return TesseractOCRProvider()
