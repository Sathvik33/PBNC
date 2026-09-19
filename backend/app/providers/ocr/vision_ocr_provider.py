import base64
import httpx
from typing import Optional
from app.core.config import settings
from app.core.logging import logger
from app.providers.ocr.base import OCRProvider, OCRResult


class VisionLLMOCRProvider(OCRProvider):
    """
    Vision-based OCR provider using Groq or OpenRouter vision models.
    Transcribes images, terminal outputs, and complex scanned documents with high accuracy.
    """
    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        self.openrouter_key = settings.OPENROUTER_API_KEY
        # Groq's high-speed vision model
        self.groq_vision_model = "llama-3.2-11b-vision-preview"

    def extract_text(self, image_bytes: bytes) -> OCRResult:
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        prompt = (
            "Extract and transcribe all readable text, terminal commands, logs, questions, options, "
            "and output verbatim from this image. Preserve exact lines and formatting. "
            "Return only the extracted text without introductory commentary."
        )

        # 1. Try Groq Vision
        if self.groq_key:
            try:
                logger.info(f"Extracting image text with Groq Vision ({self.groq_vision_model})...")
                headers = {
                    "Authorization": f"Bearer {self.groq_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": self.groq_vision_model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/png;base64,{base64_image}"}
                                }
                            ]
                        }
                    ],
                    "temperature": 0.1,
                    "max_tokens": 2048
                }
                with httpx.Client(timeout=40.0) as client:
                    res = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                    res.raise_for_status()
                    data = res.json()
                    text = data["choices"][0]["message"]["content"].strip()
                    return OCRResult(
                        raw_text=text,
                        confidence=0.95,
                        metadata={"engine": "groq_vision", "model": self.groq_vision_model},
                        is_low_quality=len(text) < 5
                    )
            except Exception as e:
                logger.warning(f"Groq Vision extraction failed: {e}. Falling back...")

        # 2. Try OpenRouter Vision
        if self.openrouter_key:
            try:
                logger.info("Extracting image text with OpenRouter Vision...")
                headers = {
                    "Authorization": f"Bearer {self.openrouter_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "meta-llama/llama-3.2-11b-vision-instruct:free",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/png;base64,{base64_image}"}
                                }
                            ]
                        }
                    ]
                }
                with httpx.Client(timeout=40.0) as client:
                    res = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
                    res.raise_for_status()
                    data = res.json()
                    text = data["choices"][0]["message"]["content"].strip()
                    return OCRResult(
                        raw_text=text,
                        confidence=0.90,
                        metadata={"engine": "openrouter_vision"},
                        is_low_quality=len(text) < 5
                    )
            except Exception as e:
                logger.warning(f"OpenRouter Vision extraction failed: {e}")

        return OCRResult(
            raw_text="",
            confidence=0.0,
            metadata={"engine": "vision_ocr", "error": "No vision API succeeded"},
            is_low_quality=True
        )
