import io
from PIL import Image
import pytesseract
from app.providers.ocr.base import OCRProvider, OCRResult
from app.core.logging import logger


class TesseractOCRProvider(OCRProvider):
    def __init__(self, tesseract_cmd: str = None, min_confidence: float = 60.0):
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        self.min_confidence = min_confidence

    def extract_text(self, image_bytes: bytes) -> OCRResult:
        try:
            image = Image.open(io.BytesIO(image_bytes))

            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            words = []
            confidences = []

            for i, conf_str in enumerate(data.get("conf", [])):
                try:
                    conf = float(conf_str)
                except (ValueError, TypeError):
                    continue

                word = data.get("text", [])[i].strip()
                if conf > 0 and word:
                    words.append(word)
                    confidences.append(conf)

            full_text = " ".join(words)
            avg_confidence = (sum(confidences) / len(confidences)) if confidences else 0.0

            return OCRResult(
                raw_text=full_text,
                confidence=avg_confidence / 100.0,
                metadata={
                    "engine": "tesseract",
                    "word_count": len(words),
                    "raw_confidence": avg_confidence
                },
                is_low_quality=(avg_confidence < self.min_confidence or len(words) == 0)
            )

        except Exception as e:
            logger.warning(f"Tesseract OCR failed: {e}")
            return OCRResult(
                raw_text="",
                confidence=0.0,
                metadata={"engine": "tesseract", "error": str(e)},
                is_low_quality=True
            )
