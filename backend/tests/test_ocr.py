import io
import pytest
from PIL import Image
from unittest.mock import patch
from app.providers.ocr.base import OCRResult, OCRProvider
from app.providers.ocr.tesseract_provider import TesseractOCRProvider
from app.services.ocr_service import OCRService


def test_ocr_provider_interface():
    class DummyOCR(OCRProvider):
        def extract_text(self, image_bytes: bytes) -> OCRResult:
            return OCRResult(
                raw_text="1. Sample Question?",
                confidence=0.92,
                metadata={"test": True},
                is_low_quality=False
            )

    service = OCRService(provider=DummyOCR())
    result = service.process_image(b"fake_image_bytes")
    assert result.raw_text == "1. Sample Question?"
    assert result.confidence == 0.92
    assert result.is_low_quality is False


def test_tesseract_ocr_provider_mocked():
    # Test Tesseract output parsing logic using mocked pytesseract
    mock_data = {
        "text": ["", "What", "is", "the", "capital", "of", "France?", ""],
        "conf": ["-1", "95", "92", "98", "90", "94", "88", "-1"]
    }

    with patch("pytesseract.image_to_data", return_value=mock_data):
        provider = TesseractOCRProvider()
        # Create minimal valid 10x10 PNG
        img = Image.new("RGB", (10, 10), color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")

        res = provider.extract_text(buf.getvalue())
        assert res.raw_text == "What is the capital of France?"
        assert res.confidence > 0.85
        assert res.is_low_quality is False
        assert res.metadata["word_count"] == 6


def test_tesseract_low_quality_detection():
    # Low confidence words below threshold
    mock_data = {
        "text": ["g1bber1sh"],
        "conf": ["25.0"]
    }

    with patch("pytesseract.image_to_data", return_value=mock_data):
        provider = TesseractOCRProvider(min_confidence=60.0)
        img = Image.new("RGB", (10, 10), color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")

        res = provider.extract_text(buf.getvalue())
        assert res.is_low_quality is True
