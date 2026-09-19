from app.providers.ocr.base import OCRProvider, OCRResult
from app.providers.ocr.tesseract_provider import TesseractOCRProvider
from app.providers.ocr.factory import get_ocr_provider

__all__ = ["OCRProvider", "OCRResult", "TesseractOCRProvider", "get_ocr_provider"]
